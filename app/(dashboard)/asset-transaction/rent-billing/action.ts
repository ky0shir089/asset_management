"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  assetDatas,
  companies,
  rentAssetDetails,
  rentAssets,
  rentInvoiceEvents,
  rentInvoiceItems,
  rentInvoicePayments,
  rentInvoices,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  invoiceCancelSchema,
  invoiceDraftSchema,
  invoiceIdSchema,
  invoicePaymentSchema,
  invoicePeriodSchema,
  invoiceTotals,
} from "@/lib/formSchemas/rent-billing-schema"
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import {
  cleanupRentPaymentProof,
  saveRentPaymentProof,
} from "@/lib/local-upload"

const listPath = "/asset-transaction/rent-billing"
const editPermission = "rent-billing:edit"

async function requestIp() {
  const requestHeaders = await headers()
  return (
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  )
}

async function logEvent(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    invoiceId: string
    action: string
    userId: string
    ipAddress: string | null
    detail?: Record<string, unknown>
  }
) {
  await tx.insert(rentInvoiceEvents).values({
    invoiceId: input.invoiceId,
    action: input.action,
    detail: input.detail ?? {},
    ipAddress: input.ipAddress,
    createdBy: input.userId,
  })
}

function resultMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.startsWith("Invoice ")) {
    return { success: false as const, message: error.message }
  }
  return { success: false as const, message: fallback }
}

export async function rentInvoiceCreateDraft(formData: FormData) {
  const user = await requireUser()
  const permission = await authorizeAction(editPermission)
  if (!permission.authorized) return permission.response
  const validation = invoicePeriodSchema.safeParse({
    companyId: formData.get("companyId"),
    month: formData.get("month"),
    year: formData.get("year"),
  })
  if (!validation.success)
    return resultMessage(validation.error, "Select company and billing period")
  const { companyId, month, year } = validation.data
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`
  const periodEnd = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10)
  const dueDate = new Date(Date.UTC(year, month, 0) + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10)
  const ipAddress = await requestIp()

  try {
    const invoiceId = await db.transaction(async (tx) => {
      const [company] = await tx
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(and(eq(companies.id, companyId), eq(companies.isActive, true)))
        .limit(1)
      if (!company) throw new Error("Company not found")

      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`rent-billing:${companyId}:${periodStart}`}))`
      )
      const existing = await tx
        .select({ id: rentInvoices.id })
        .from(rentInvoices)
        .where(
          and(
            eq(rentInvoices.companyId, companyId),
            eq(rentInvoices.periodStart, periodStart),
            eq(rentInvoices.periodEnd, periodEnd),
            ne(rentInvoices.status, "CANCELLED")
          )
        )
        .limit(1)
      if (existing.length)
        throw new Error("Invoice already exists for this company and period")

      const rows = await tx
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
              isNull(rentAssetDetails.dateEnd),
              gte(rentAssetDetails.dateEnd, periodStart)
            )
          )
        )
        .orderBy(asc(assetDatas.nomorAssets), asc(rentAssetDetails.id))

      const items = rows.flatMap((row) => {
        if (!row.dateStart) return []
        const start = row.dateStart > periodStart ? row.dateStart : periodStart
        const end =
          row.dateEnd && row.dateEnd < periodEnd ? row.dateEnd : periodEnd
        const activeDays = Math.max(
          0,
          Math.round(
            (Date.parse(`${end}T00:00:00Z`) -
              Date.parse(`${start}T00:00:00Z`)) /
              86_400_000
          ) + 1
        )
        if (!activeDays) return []
        const amount = Math.round(
          (row.amount * activeDays) /
            new Date(Date.UTC(year, month, 0)).getUTCDate()
        )
        return [
          {
            rentDetailId: row.rentDetailId,
            assetId: row.assetId,
            assetNumber: row.assetNumber,
            description: `Lease · ${row.assetNumber}`.slice(0, 255),
            itemType: "RENT" as const,
            billingTiming: "IN_ADVANCE" as const,
            quantity: 1,
            unitAmount: amount,
            amount,
          },
        ]
      })
      if (!items.length)
        throw new Error("No active rented assets found for this period")
      const [invoice] = await tx
        .insert(rentInvoices)
        .values({
          companyId,
          companyName: company.name,
          periodStart,
          periodEnd,
          dueDate,
          createdBy: user.id,
        })
        .returning({ id: rentInvoices.id })
      await tx
        .insert(rentInvoiceItems)
        .values(items.map((item) => ({ invoiceId: invoice.id, ...item })))
      await logEvent(tx, {
        invoiceId: invoice.id,
        action: "CREATE_DRAFT",
        userId: user.id,
        ipAddress,
        detail: { periodStart, periodEnd, itemCount: items.length },
      })
      return invoice.id
    })
    revalidatePath(listPath)
    return {
      success: true as const,
      invoiceId,
      message: "Draft invoice created",
    }
  } catch (error) {
    return resultMessage(error, "Failed to create draft invoice")
  }
}

export async function rentInvoiceUpdateDraft(
  invoiceId: string,
  input: unknown
) {
  const user = await requireUser()
  const permission = await authorizeAction(editPermission)
  if (!permission.authorized) return permission.response
  if (!invoiceIdSchema.safeParse(invoiceId).success)
    return { success: false as const, message: "Invoice not found" }
  const validation = invoiceDraftSchema.safeParse(input)
  if (!validation.success)
    return resultMessage(validation.error, "Invalid invoice data")
  const data = validation.data
  const ipAddress = await requestIp()
  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({
          id: rentInvoices.id,
          companyId: rentInvoices.companyId,
          periodStart: rentInvoices.periodStart,
          periodEnd: rentInvoices.periodEnd,
          status: rentInvoices.status,
        })
        .from(rentInvoices)
        .where(eq(rentInvoices.id, invoiceId))
        .for("update")
      if (!invoice || invoice.status !== "DRAFT")
        throw new Error("Only draft invoices can be edited")
      if (
        data.items.some(
          (item) => item.rentDetailId === null && item.itemType === "RENT"
        )
      )
        throw new Error("Rental items must reference a lease detail")

      const detailIds = [
        ...new Set(
          data.items.flatMap((item) =>
            item.rentDetailId ? [item.rentDetailId] : []
          )
        ),
      ]
      if (detailIds.length) {
        const validDetails = await tx
          .select({
            id: rentAssetDetails.id,
            assetId: rentAssetDetails.assetId,
            dateStart: rentAssetDetails.dateStart,
            dateEnd: rentAssetDetails.dateEnd,
            leaseStatus: rentAssets.status,
            amount: rentAssetDetails.amount,
          })
          .from(rentAssetDetails)
          .innerJoin(
            rentAssets,
            eq(rentAssetDetails.rentAssetId, rentAssets.id)
          )
          .where(
            and(
              inArray(rentAssetDetails.id, detailIds),
              eq(rentAssets.companyId, invoice.companyId)
            )
          )
        const detailsById = new Map(
          validDetails.map((detail) => [detail.id, detail])
        )
        if (detailIds.some((id) => !detailsById.has(id)))
          throw new Error("Rental item does not belong to this company")
        for (const item of data.items) {
          if (!item.rentDetailId || item.itemType !== "RENT") continue
          const detail = detailsById.get(item.rentDetailId)!
          if (item.assetId !== detail.assetId)
            throw new Error("Rental item asset does not match lease")
          if (
            detail.leaseStatus !== "APPROVED" ||
            !detail.dateStart ||
            detail.dateStart > invoice.periodEnd ||
            (detail.dateEnd && detail.dateEnd < invoice.periodStart)
          ) {
            throw new Error(
              "Rental item lease is not active for invoice period"
            )
          }
        }
      }
      const assetIds = [
        ...new Set(
          data.items.flatMap((item) => (item.assetId ? [item.assetId] : []))
        ),
      ]
      if (assetIds.length) {
        const validAssets = await tx
          .select({ id: assetDatas.id })
          .from(assetDatas)
          .innerJoin(
            rentAssetDetails,
            eq(rentAssetDetails.assetId, assetDatas.id)
          )
          .innerJoin(
            rentAssets,
            eq(rentAssetDetails.rentAssetId, rentAssets.id)
          )
          .where(
            and(
              inArray(assetDatas.id, assetIds),
              eq(rentAssets.companyId, invoice.companyId)
            )
          )
        if (
          assetIds.some((id) => !validAssets.some((asset) => asset.id === id))
        )
          throw new Error("Asset does not belong to this company")
      }
      const assetNumbers = assetIds.length
        ? new Map(
            (
              await tx
                .select({ id: assetDatas.id, number: assetDatas.nomorAssets })
                .from(assetDatas)
                .where(inArray(assetDatas.id, assetIds))
            ).map((asset) => [asset.id, asset.number])
          )
        : new Map<string, string>()
      const items = data.items.map((item) => ({
        invoiceId,
        rentDetailId: item.rentDetailId,
        assetId: item.assetId,
        assetNumber: item.assetId
          ? (assetNumbers.get(item.assetId) ?? null)
          : null,
        description: item.description,
        itemType: item.itemType,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        amount: item.quantity * item.unitAmount,
        billingTiming: item.itemType === "RENT" ? item.billingTiming : null,
      }))
      if (
        items.some(
          (item) =>
            !Number.isSafeInteger(item.amount) || item.amount > 2_000_000_000
        )
      ) {
        throw new Error("Invoice item exceeds supported amount")
      }
      const totals = invoiceTotals(
        items,
        data.vatRate,
        data.withholdingRate,
        data.depositDeduction
      )
      await tx
        .delete(rentInvoiceItems)
        .where(eq(rentInvoiceItems.invoiceId, invoiceId))
      await tx.insert(rentInvoiceItems).values(items)
      await tx
        .update(rentInvoices)
        .set({
          dueDate: data.dueDate,
          vatRate: data.vatRate,
          vatAmount: totals.vatAmount,
          withholdingRate: data.withholdingRate,
          withholdingAmount: totals.withholdingAmount,
          depositDeduction: totals.depositDeduction,
          subtotal: totals.subtotal,
          total: totals.total,
          updatedBy: user.id,
        })
        .where(eq(rentInvoices.id, invoiceId))
      await logEvent(tx, {
        invoiceId,
        action: "UPDATE_DRAFT",
        userId: user.id,
        ipAddress,
        detail: { itemCount: items.length, total: totals.total },
      })
    })
    revalidatePath(`${listPath}/${invoiceId}`)
    revalidatePath(listPath)
    return { success: true as const, message: "Draft invoice saved" }
  } catch (error) {
    return resultMessage(error, "Failed to save draft invoice")
  }
}

export async function rentInvoiceIssue(invoiceId: string) {
  const user = await requireUser()
  const permission = await authorizeAction(editPermission)
  if (!permission.authorized) return permission.response
  if (!invoiceIdSchema.safeParse(invoiceId).success)
    return { success: false as const, message: "Invoice not found" }
  const ipAddress = await requestIp()
  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(rentInvoices)
        .where(eq(rentInvoices.id, invoiceId))
        .for("update")
      if (!invoice || invoice.status !== "DRAFT")
        throw new Error("Only draft invoices can be issued")
      const items = await tx
        .select({
          quantity: rentInvoiceItems.quantity,
          unitAmount: rentInvoiceItems.unitAmount,
        })
        .from(rentInvoiceItems)
        .where(eq(rentInvoiceItems.invoiceId, invoiceId))
      if (!items.length) throw new Error("Cannot issue an empty invoice")
      const totals = invoiceTotals(
        items,
        invoice.vatRate,
        invoice.withholdingRate,
        invoice.depositDeduction
      )
      const issueYear = new Date().getFullYear()
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`rent-invoice-sequence:${issueYear}`}))`
      )
      const [sequenceRow] = await tx
        .select({
          sequence:
            sql<number>`coalesce(max(substring(${rentInvoices.invoiceNo} from '/([0-9]+)$')::integer), 0) + 1`.mapWith(
              Number
            ),
        })
        .from(rentInvoices)
        .where(sql`${rentInvoices.invoiceNo} like ${`INV/${issueYear}/%`}`)
      if (sequenceRow.sequence > 99_999)
        throw new Error("Invoice number capacity reached for this year")
      const invoiceNo = `INV/${issueYear}/${String(sequenceRow.sequence).padStart(5, "0")}`
      const [issued] = await tx
        .update(rentInvoices)
        .set({
          invoiceNo,
          status: "ISSUED",
          issuedAt: new Date(),
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          withholdingAmount: totals.withholdingAmount,
          total: totals.total,
          updatedBy: user.id,
        })
        .where(
          and(eq(rentInvoices.id, invoiceId), eq(rentInvoices.status, "DRAFT"))
        )
        .returning({ id: rentInvoices.id })
      if (!issued) throw new Error("Invoice was already changed")
      await logEvent(tx, {
        invoiceId,
        action: "ISSUE_INVOICE",
        userId: user.id,
        ipAddress,
        detail: { invoiceNo, total: totals.total },
      })
    })
    revalidatePath(listPath)
    revalidatePath(`${listPath}/${invoiceId}`)
    return { success: true as const, message: "Invoice issued" }
  } catch (error) {
    return resultMessage(error, "Failed to issue invoice")
  }
}

export async function rentInvoiceCancel(input: unknown) {
  const user = await requireUser()
  const permission = await authorizeAction(editPermission)
  if (!permission.authorized) return permission.response
  const validation = invoiceCancelSchema.safeParse(input)
  if (!validation.success)
    return resultMessage(validation.error, "Invalid cancellation")
  const { invoiceId, reason } = validation.data
  const ipAddress = await requestIp()
  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({ status: rentInvoices.status, total: rentInvoices.total })
        .from(rentInvoices)
        .where(eq(rentInvoices.id, invoiceId))
        .for("update")
      if (
        !invoice ||
        (invoice.status !== "DRAFT" && invoice.status !== "ISSUED")
      )
        throw new Error("Invoice cannot be cancelled")
      const [payment] = await tx
        .select({
          paid: sql<number>`coalesce(sum(${rentInvoicePayments.amount}), 0)`.mapWith(
            Number
          ),
        })
        .from(rentInvoicePayments)
        .where(eq(rentInvoicePayments.invoiceId, invoiceId))
      if (Number(payment.paid) > 0)
        throw new Error("Invoices with recorded payments cannot be cancelled")
      await tx
        .update(rentInvoices)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
          updatedBy: user.id,
        })
        .where(eq(rentInvoices.id, invoiceId))
      await logEvent(tx, {
        invoiceId,
        action: "CANCEL_INVOICE",
        userId: user.id,
        ipAddress,
        detail: { reason, total: invoice.total },
      })
    })
    revalidatePath(listPath)
    revalidatePath(`${listPath}/${invoiceId}`)
    return { success: true as const, message: "Invoice cancelled" }
  } catch (error) {
    return resultMessage(error, "Failed to cancel invoice")
  }
}

export async function rentInvoiceRecordPayment(input: FormData) {
  const user = await requireUser()
  const permission = await authorizeAction(editPermission)
  if (!permission.authorized) return permission.response
  const proofEntry = input.get("proof")
  const validation = invoicePaymentSchema.safeParse({
    invoiceId: input.get("invoiceId"),
    paidAt: input.get("paidAt"),
    method: input.get("method"),
    amount: input.get("amount"),
    reference: input.get("reference") ?? "",
    proof:
      proofEntry instanceof File && proofEntry.size > 0
        ? proofEntry
        : undefined,
  })
  if (!validation.success)
    return resultMessage(validation.error, "Invalid payment")
  const data = validation.data
  let proof: Awaited<ReturnType<typeof saveRentPaymentProof>> | null = null
  if (data.proof) {
    try {
      proof = await saveRentPaymentProof(data.proof)
    } catch (error) {
      return resultMessage(error, "Invalid payment proof")
    }
  }
  const ipAddress = await requestIp()
  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({ status: rentInvoices.status, total: rentInvoices.total })
        .from(rentInvoices)
        .where(eq(rentInvoices.id, data.invoiceId))
        .for("update")
      if (!invoice || invoice.status !== "ISSUED")
        throw new Error("Only issued invoices can receive payments")
      const [payment] = await tx
        .select({
          paid: sql<number>`coalesce(sum(${rentInvoicePayments.amount}), 0)`.mapWith(
            Number
          ),
        })
        .from(rentInvoicePayments)
        .where(eq(rentInvoicePayments.invoiceId, data.invoiceId))
      const balance = invoice.total - Number(payment.paid)
      if (data.amount > balance)
        throw new Error("Payment exceeds outstanding balance")
      await tx.insert(rentInvoicePayments).values({
        invoiceId: data.invoiceId,
        paidAt: data.paidAt,
        method: data.method,
        amount: data.amount,
        reference: data.reference || null,
        proofName: proof?.name ?? null,
        proofPath: proof?.path ?? null,
        createdBy: user.id,
      })
      await logEvent(tx, {
        invoiceId: data.invoiceId,
        action: "RECORD_PAYMENT",
        userId: user.id,
        ipAddress,
        detail: {
          amount: data.amount,
          method: data.method,
          reference: data.reference ?? null,
        },
      })
    })
    revalidatePath(listPath)
    revalidatePath(`${listPath}/${data.invoiceId}`)
    revalidatePath("/asset/list-asset")
    return { success: true as const, message: "Payment recorded" }
  } catch (error) {
    if (proof) await cleanupRentPaymentProof(proof.path).catch(() => {})
    return resultMessage(error, "Failed to record payment")
  }
}
