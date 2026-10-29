import "server-only"

import { db } from "@/drizzle/db"
import {
  assetDatas,
  assetTransfers,
  companies,
  outlets,
  rentAssetDetails,
  rentAssets,
  rentInvoiceEvents,
  rentInvoiceItems,
  rentInvoicePayments,
  rentInvoices,
  users,
} from "@/drizzle/schema"
import { can, requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { invoiceIdSchema } from "@/lib/formSchemas/rent-billing-schema"
import { paginationMeta, paginationParams } from "@/lib/helper"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

const invoiceTablePermission = "rent-billing:browse"
const invoiceReadPermission = "rent-billing:read"
const invoiceEditPermission = "rent-billing:edit"

function paymentState(total: number, paidAmount: number, dueDate: string) {
  if (total > 0 && paidAmount >= total) return "PAID" as const
  if (dueDate < new Date().toISOString().slice(0, 10)) return "OVERDUE" as const
  if (paidAmount > 0) return "PARTIALLY_PAID" as const
  return "ISSUED" as const
}

async function invoicePayments(invoiceIds: string[]) {
  if (!invoiceIds.length) return new Map<string, number>()
  const rows = await db
    .select({
      invoiceId: rentInvoicePayments.invoiceId,
      amount: sql<number>`sum(${rentInvoicePayments.amount})`.mapWith(Number),
    })
    .from(rentInvoicePayments)
    .where(inArray(rentInvoicePayments.invoiceId, invoiceIds))
    .groupBy(rentInvoicePayments.invoiceId)
  return new Map(rows.map((row) => [row.invoiceId, row.amount]))
}

export async function rentInvoiceIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission(invoiceTablePermission)
  const canEdit = await can(invoiceEditPermission)
  const pagination = paginationParams(currentPage, size)
  const pageSize = pagination.pageSize
  const page = pagination.page
  const search = query?.trim()
  const conditions = []
  if (
    user.role !== "Super Administrator" &&
    user.role !== "Admin GA" &&
    !canEdit
  ) {
    conditions.push(eq(rentInvoices.createdBy, user.id))
  }
  if (search) {
    const match = or(
      ilike(rentInvoices.invoiceNo, `%${search}%`),
      ilike(rentInvoices.companyName, `%${search}%`)
    )
    if (match) conditions.push(match)
  }
  const where = conditions.length ? and(...conditions) : undefined
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: rentInvoices.id,
        invoiceNo: rentInvoices.invoiceNo,
        companyName: rentInvoices.companyName,
        periodStart: rentInvoices.periodStart,
        periodEnd: rentInvoices.periodEnd,
        dueDate: rentInvoices.dueDate,
        status: rentInvoices.status,
        total: rentInvoices.total,
      })
      .from(rentInvoices)
      .where(where)
      .orderBy(desc(rentInvoices.createdAt), desc(rentInvoices.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(rentInvoices).where(where),
  ])
  const payments = await invoicePayments(rows.map((row) => row.id))
  const data = rows.map((row) => ({
    ...row,
    paidAmount: payments.get(row.id) ?? 0,
    paymentStatus:
      row.status === "ISSUED"
        ? paymentState(row.total, payments.get(row.id) ?? 0, row.dueDate)
        : row.status,
  }))
  return {
    data,
    meta: paginationMeta(pagination, Number(total), data.length),
    canEdit,
  }
}
export type rentInvoiceIndexType = Awaited<
  ReturnType<typeof rentInvoiceIndex>
>["data"][number]

export async function rentInvoiceCompanies() {
  await requireUser()
  await requirePermission(invoiceEditPermission)
  return db
    .select({ id: companies.id, name: companies.name, code: companies.code })
    .from(companies)
    .where(eq(companies.isActive, true))
    .orderBy(asc(companies.name))
}
export type rentInvoiceCompany = Awaited<
  ReturnType<typeof rentInvoiceCompanies>
>[number]

export async function rentInvoiceDraftCandidates(
  companyId: string,
  month: number,
  year: number
) {
  await requireUser()
  await requirePermission(invoiceEditPermission)
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`
  const periodEnd = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10)
  const rows = await db
    .select({
      rentDetailId: rentAssetDetails.id,
      assetId: assetDatas.id,
      assetNumber: assetDatas.nomorAssets,
      rentNo: rentAssets.rentNo,
      dateStart: rentAssetDetails.dateStart,
      dateEnd: rentAssetDetails.dateEnd,
      amount: rentAssetDetails.amount,
    })
    .from(rentAssetDetails)
    .innerJoin(rentAssets, eq(rentAssetDetails.rentAssetId, rentAssets.id))
    .innerJoin(assetDatas, eq(rentAssetDetails.assetId, assetDatas.id))
    .where(
      and(
        eq(rentAssets.companyId, companyId),
        eq(rentAssets.status, "APPROVED"),
        lte(rentAssetDetails.dateStart, periodEnd),
        or(
          sql`${rentAssetDetails.dateEnd} is null`,
          gte(rentAssetDetails.dateEnd, periodStart)
        )
      )
    )
    .orderBy(asc(assetDatas.nomorAssets), asc(rentAssetDetails.id))

  return rows.flatMap((row) => {
    if (!row.dateStart) return []
    const start = row.dateStart > periodStart ? row.dateStart : periodStart
    const end = row.dateEnd && row.dateEnd < periodEnd ? row.dateEnd : periodEnd
    const activeDays = Math.max(
      0,
      Math.round(
        (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
          86_400_000
      ) + 1
    )
    if (!activeDays) return []
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const amount = Math.round((row.amount * activeDays) / daysInMonth)
    return [
      {
        ...row,
        description: `Lease ${row.rentNo} · ${row.assetNumber}`,
        activeDays,
        amount,
      },
    ]
  })
}

export async function rentInvoiceShow(invoiceId: string) {
  if (!invoiceIdSchema.safeParse(invoiceId).success) notFound()
  const user = await requireUser()
  await requirePermission(invoiceReadPermission)
  const canEdit = await can(invoiceEditPermission)
  const [row] = await db
    .select({
      id: rentInvoices.id,
      companyId: rentInvoices.companyId,
      companyName: rentInvoices.companyName,
      invoiceNo: rentInvoices.invoiceNo,
      periodStart: rentInvoices.periodStart,
      periodEnd: rentInvoices.periodEnd,
      dueDate: rentInvoices.dueDate,
      status: rentInvoices.status,
      cancelReason: rentInvoices.cancelReason,
      subtotal: rentInvoices.subtotal,
      vatRate: rentInvoices.vatRate,
      vatAmount: rentInvoices.vatAmount,
      withholdingRate: rentInvoices.withholdingRate,
      withholdingAmount: rentInvoices.withholdingAmount,
      depositDeduction: rentInvoices.depositDeduction,
      total: rentInvoices.total,
      createdBy: rentInvoices.createdBy,
    })
    .from(rentInvoices)
    .where(eq(rentInvoices.id, invoiceId))
    .limit(1)
  if (!row) notFound()
  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin && !canEdit && row.createdBy !== user.id) notFound()

  const [items, payments, events, [{ paidAmount }]] = await Promise.all([
    db
      .select({
        id: rentInvoiceItems.id,
        rentDetailId: rentInvoiceItems.rentDetailId,
        assetId: rentInvoiceItems.assetId,
        assetNumber: rentInvoiceItems.assetNumber,
        description: rentInvoiceItems.description,
        itemType: rentInvoiceItems.itemType,
        billingTiming: rentInvoiceItems.billingTiming,
        quantity: rentInvoiceItems.quantity,
        unitAmount: rentInvoiceItems.unitAmount,
        amount: rentInvoiceItems.amount,
      })
      .from(rentInvoiceItems)
      .where(eq(rentInvoiceItems.invoiceId, invoiceId))
      .orderBy(asc(rentInvoiceItems.id)),
    db
      .select({
        id: rentInvoicePayments.id,
        paidAt: rentInvoicePayments.paidAt,
        method: rentInvoicePayments.method,
        amount: rentInvoicePayments.amount,
        reference: rentInvoicePayments.reference,
        proofName: rentInvoicePayments.proofName,
        proofPath: rentInvoicePayments.proofPath,
        createdAt: rentInvoicePayments.createdAt,
      })
      .from(rentInvoicePayments)
      .where(eq(rentInvoicePayments.invoiceId, invoiceId))
      .orderBy(desc(rentInvoicePayments.paidAt), desc(rentInvoicePayments.id)),
    db
      .select({
        id: rentInvoiceEvents.id,
        action: rentInvoiceEvents.action,
        detail: rentInvoiceEvents.detail,
        ipAddress: rentInvoiceEvents.ipAddress,
        createdAt: rentInvoiceEvents.createdAt,
        userName: users.name,
      })
      .from(rentInvoiceEvents)
      .innerJoin(users, eq(rentInvoiceEvents.createdBy, users.id))
      .where(eq(rentInvoiceEvents.invoiceId, invoiceId))
      .orderBy(desc(rentInvoiceEvents.createdAt), desc(rentInvoiceEvents.id)),
    db
      .select({
        paidAmount:
          sql<number>`coalesce(sum(${rentInvoicePayments.amount}), 0)`.mapWith(
            Number
          ),
      })
      .from(rentInvoicePayments)
      .where(eq(rentInvoicePayments.invoiceId, invoiceId)),
  ])
  const paymentStatus =
    row.status === "ISSUED"
      ? paymentState(row.total, Number(paidAmount), row.dueDate)
      : row.status
  return {
    ...row,
    items,
    payments,
    events,
    paidAmount: Number(paidAmount),
    balance: Math.max(0, row.total - Number(paidAmount)),
    paymentStatus,
    canEdit,
  }
}
export type rentInvoiceDetail = Awaited<ReturnType<typeof rentInvoiceShow>>

export async function rentInvoiceReceiptShow(
  invoiceId: string,
  paymentId: string
) {
  if (
    !invoiceIdSchema.safeParse(invoiceId).success ||
    !invoiceIdSchema.safeParse(paymentId).success
  ) {
    notFound()
  }
  await requireUser()
  await requirePermission(invoiceReadPermission)
  const [receipt] = await db
    .select({
      paymentId: rentInvoicePayments.id,
      invoiceNo: rentInvoices.invoiceNo,
      companyName: rentInvoices.companyName,
      periodStart: rentInvoices.periodStart,
      periodEnd: rentInvoices.periodEnd,
      paidAt: rentInvoicePayments.paidAt,
      method: rentInvoicePayments.method,
      amount: rentInvoicePayments.amount,
      reference: rentInvoicePayments.reference,
    })
    .from(rentInvoicePayments)
    .innerJoin(rentInvoices, eq(rentInvoicePayments.invoiceId, rentInvoices.id))
    .where(
      and(
        eq(rentInvoicePayments.id, paymentId),
        eq(rentInvoicePayments.invoiceId, invoiceId),
        eq(rentInvoices.status, "ISSUED")
      )
    )
    .limit(1)
  if (!receipt) notFound()
  return {
    ...receipt,
    invoiceNo: receipt.invoiceNo ?? `Draft ${invoiceId}`,
    period: `${receipt.periodStart} – ${receipt.periodEnd}`,
    amount: new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(receipt.amount),
    paidAt: new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date(`${receipt.paidAt}T00:00:00Z`)),
    method: receipt.method.replaceAll("_", " "),
  }
}

export async function rentInvoiceHistoryForAsset(assetId: string) {
  if (!invoiceIdSchema.safeParse(assetId).success) notFound()
  const user = await requireUser()
  await requirePermission("received-asset:read")
  const superAdmin = await isSuperAdmin(user.id)
  const result = await db
    .select({
      invoiceId: rentInvoices.id,
      invoiceNo: rentInvoices.invoiceNo,
      companyName: rentInvoices.companyName,
      periodStart: rentInvoices.periodStart,
      periodEnd: rentInvoices.periodEnd,
      dueDate: rentInvoices.dueDate,
      status: rentInvoices.status,
      total: rentInvoices.total,
      amount: rentInvoiceItems.amount,
      paidAt: sql<
        string | null
      >`(select max(p.paid_at) from rent_invoice_payments p where p.invoice_id = ${rentInvoices.id})`,
    })
    .from(rentInvoiceItems)
    .innerJoin(rentInvoices, eq(rentInvoiceItems.invoiceId, rentInvoices.id))
    .where(and(eq(rentInvoiceItems.assetId, assetId), neCancelled()))
    .orderBy(desc(rentInvoices.periodStart), desc(rentInvoices.id))

  const paidAmounts = await Promise.all(
    result.map(async (row) => {
      const [paid] = await db
        .select({
          amount:
            sql<number>`coalesce(sum(${rentInvoicePayments.amount}), 0)`.mapWith(
              Number
            ),
        })
        .from(rentInvoicePayments)
        .where(eq(rentInvoicePayments.invoiceId, row.invoiceId))
      return Number(paid.amount)
    })
  )
  const withPaymentState = result.map((row, index) => ({
    ...row,
    paymentStatus:
      row.status === "ISSUED"
        ? paymentState(row.total, paidAmounts[index] ?? 0, row.dueDate)
        : row.status,
  }))
  if (superAdmin || user.role === "Admin GA" || user.role === "Admin IT")
    return withPaymentState
  const [asset] = await db
    .select({ outletId: assetDatas.outletId, createdBy: assetDatas.createdBy })
    .from(assetDatas)
    .where(eq(assetDatas.id, assetId))
    .limit(1)
  if (!asset) notFound()
  if (user.role === "Branch Manager" && user.branchId) {
    const [outlet] = await db
      .select({ branchId: outlets.branchId })
      .from(outlets)
      .where(eq(outlets.id, asset.outletId))
      .limit(1)
    if (!outlet || outlet.branchId !== user.branchId) notFound()
  } else {
    const [holder] = await db
      .select({ userId: assetTransfers.userId })
      .from(assetTransfers)
      .where(
        and(
          eq(assetTransfers.assetId, assetId),
          eq(assetTransfers.status, "RECEIVED")
        )
      )
      .orderBy(desc(assetTransfers.createdAt), desc(assetTransfers.id))
      .limit(1)
    if (asset.createdBy !== user.id && holder?.userId !== user.id) notFound()
  }
  return withPaymentState
}

function neCancelled() {
  return sql`${rentInvoices.status} <> 'CANCELLED'`
}
