import "server-only"

import { db } from "@/drizzle/db"
import {
  assetTransfers,
  branches,
  companies,
  outlets,
  rentAssets,
  users,
} from "@/drizzle/schema"
import { can, requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { notFound } from "next/navigation"
import { z } from "zod"
import { requireUser } from "./require-user"

export async function assetLeaseIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("maintenance:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const canUpdate = await can("maintenance:edit")
  const conditions: SQL[] = []

  if (user.role !== "Super Administrator" && user.role !== "Admin GA") {
    const visible = canUpdate
      ? or(eq(rentAssets.createdBy, user.id), eq(rentAssets.status, "NEW"))
      : eq(rentAssets.createdBy, user.id)
    if (visible) conditions.push(visible)
  }

  if (search) {
    const pattern = `%${search}%`
    const matches = or(
      ilike(rentAssets.rentNo, pattern),
      ilike(rentAssets.note, pattern),
      ilike(rentAssets.status, pattern),
      inArray(
        rentAssets.companyId,
        db
          .select({ id: companies.id })
          .from(companies)
          .where(ilike(companies.name, pattern))
      )
    )
    if (matches) conditions.push(matches)
  }

  const where = conditions.length ? and(...conditions) : undefined
  const [data, [{ count: total }]] = await Promise.all([
    db.query.rentAssets.findMany({
      where,
      with: {
        company: { columns: { id: true, code: true, name: true } },
        details: { columns: { id: true, amount: true } },
      },
      orderBy: (rentAssets, { desc }) => [desc(rentAssets.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(rentAssets).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function assetLeaseShow(rentId: string) {
  if (!z.uuid().safeParse(rentId).success) {
    notFound()
  }

  const user = await requireUser()
  await requirePermission("asset-lease:read")
  const [canUpdate, canReturnAsset] = await Promise.all([
    can("maintenance:edit"),
    can("asset-lease:update"),
  ])

  const data = await db.query.rentAssets.findFirst({
    where: eq(rentAssets.id, rentId),
    with: {
      company: {
        columns: { id: true, code: true, name: true },
      },
      details: {
        orderBy: (details, { asc }) => [asc(details.createdAt)],
        with: {
          photos: {
            columns: {
              id: true,
              transferId: true,
              name: true,
              path: true,
              type: true,
            },
            orderBy: (photos, { asc }) => [asc(photos.createdAt)],
          },
          asset: {
            columns: {
              id: true,
              nomorAssets: true,
              outletId: true,
              status: true,
            },
            with: {
              outlet: {
                columns: { id: true, outletId: true, name: true },
              },
              poDetail: {
                with: {
                  prDetail: {
                    with: {
                      assetCode: {
                        columns: { code: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!data) {
    notFound()
  }

  const superAdmin = await isSuperAdmin(user.id)
  const visible =
    superAdmin ||
    data.createdBy === user.id ||
    (canUpdate && data.status === "NEW")
  if (!visible) notFound()

  const detailIds = data.details.map((detail) => detail.id)
  const confirmingUsers = alias(users, "confirming_users")
  const transferHistory = detailIds.length
    ? await db
        .select({
          id: assetTransfers.id,
          rentDtlId: assetTransfers.rentDtlId,
          transferDate: assetTransfers.transferDate,
          status: assetTransfers.status,
          receivedAt: assetTransfers.receivedAt,
          outletName: outlets.name,
          assignedUserName: users.name,
          assignedUserImage: users.image,
          confirmedByName: confirmingUsers.name,
          confirmedByImage: confirmingUsers.image,
        })
        .from(assetTransfers)
        .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
        .innerJoin(users, eq(assetTransfers.userId, users.id))
        .leftJoin(
          confirmingUsers,
          eq(assetTransfers.receivedBy, confirmingUsers.id)
        )
        .where(inArray(assetTransfers.rentDtlId, detailIds))
        .orderBy(
          desc(assetTransfers.transferDate),
          desc(assetTransfers.createdAt),
          desc(assetTransfers.id)
        )
    : []

  const receiptPhotosByTransfer = new Map<
    string,
    Array<{ id: string; name: string; path: string }>
  >()
  for (const detail of data.details) {
    for (const photo of detail.photos) {
      if (photo.type !== "RECEIVE" || !photo.transferId) continue
      receiptPhotosByTransfer.set(photo.transferId, [
        ...(receiptPhotosByTransfer.get(photo.transferId) ?? []),
        { id: photo.id, name: photo.name, path: photo.path },
      ])
    }
  }

  const transferHistoryByDetail = new Map<
    string,
    Array<
      (typeof transferHistory)[number] & {
        receiptPhotos: Array<{ id: string; name: string; path: string }>
      }
    >
  >()
  for (const transfer of transferHistory) {
    if (!transfer.rentDtlId) continue
    transferHistoryByDetail.set(transfer.rentDtlId, [
      ...(transferHistoryByDetail.get(transfer.rentDtlId) ?? []),
      {
        ...transfer,
        receiptPhotos: receiptPhotosByTransfer.get(transfer.id) ?? [],
      },
    ])
  }

  const canTransfer = canUpdate && data.status === "APPROVED"
  const canReturn = canReturnAsset && data.status === "APPROVED"
  const assetIds = data.details.map((detail) => detail.asset.id)
  let transferOutlets: Array<{
    id: string
    outletId: string
    name: string
    branchId: string
  }> = []
  let transferUsers: Array<{
    id: string
    name: string
    outletId: string
  }> = []
  const latestTransferByAsset = new Map<
    string,
    {
      id: string
      transferDate: string
      outletId: string
      outletName: string
      userId: string
      userName: string
      status: "PENDING" | "RECEIVED"
      receivedAt: Date | null
    }
  >()

  if (canTransfer && assetIds.length) {
    const [latestTransfers, eligibleOutlets] = await Promise.all([
      db
        .selectDistinctOn([assetTransfers.assetId], {
          id: assetTransfers.id,
          assetId: assetTransfers.assetId,
          transferDate: assetTransfers.transferDate,
          outletId: assetTransfers.outletId,
          outletName: outlets.name,
          userId: assetTransfers.userId,
          userName: users.name,
          status: assetTransfers.status,
          receivedAt: assetTransfers.receivedAt,
        })
        .from(assetTransfers)
        .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
        .innerJoin(users, eq(assetTransfers.userId, users.id))
        .where(inArray(assetTransfers.assetId, assetIds))
        .orderBy(
          assetTransfers.assetId,
          desc(assetTransfers.createdAt),
          desc(assetTransfers.id)
        ),
      db
        .select({
          id: outlets.id,
          outletId: outlets.outletId,
          name: outlets.name,
          branchId: branches.branchId,
        })
        .from(outlets)
        .innerJoin(branches, eq(outlets.branchId, branches.branchId))
        .innerJoin(
          companies,
          eq(branches.companyId, companies.talentaCompanyId)
        )
        .where(
          and(
            eq(companies.id, data.companyId),
            eq(branches.isActive, true),
            eq(outlets.isActive, true)
          )
        )
        .orderBy(asc(outlets.name)),
    ])

    transferOutlets = eligibleOutlets
    latestTransfers.forEach((transfer) =>
      latestTransferByAsset.set(transfer.assetId, transfer)
    )

    if (eligibleOutlets.length) {
      const eligibleUsers = await db.query.users.findMany({
        columns: { id: true, name: true, companyId: true, branchId: true },
      })

      transferUsers = eligibleUsers.flatMap((user) => {
        const outlet = eligibleOutlets.find(
          (candidate) =>
            candidate.branchId === user.companyId &&
            candidate.outletId === user.branchId
        )
        return outlet
          ? [{ id: user.id, name: user.name, outletId: outlet.id }]
          : []
      })
    }
  }

  const returnOutlets = canReturn
    ? await db
        .select({
          id: outlets.id,
          outletId: outlets.outletId,
          name: outlets.name,
        })
        .from(outlets)
        .innerJoin(branches, eq(outlets.branchId, branches.branchId))
        .innerJoin(
          companies,
          eq(branches.companyId, companies.talentaCompanyId)
        )
        .where(
          and(
            eq(outlets.isActive, true),
            eq(branches.isActive, true),
            eq(companies.isActive, true),
            eq(companies.code, "LSA")
          )
        )
        .orderBy(asc(outlets.name))
    : []

  return {
    ...data,
    details: data.details.map((detail) => ({
      ...detail,
      latestTransfer: latestTransferByAsset.get(detail.asset.id) ?? null,
      transferHistory: transferHistoryByDetail.get(detail.id) ?? [],
    })),
    canDecide: canUpdate && data.status === "NEW",
    canTransfer,
    canReturn,
    transferOutlets,
    transferUsers,
    returnOutlets,
  }
}

export type assetLeaseIndexType = Awaited<
  ReturnType<typeof assetLeaseIndex>
>["data"][0]
export type assetLeaseShowType = Awaited<ReturnType<typeof assetLeaseShow>>
