import "server-only"

import { db } from "@/drizzle/db"
import { companies, rentAssets } from "@/drizzle/schema"
import { can, requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { and, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm"
import { notFound } from "next/navigation"
import { z } from "zod"
import { requireUser } from "./require-user"

export async function assetLeaseIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("asset-lease:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const superAdmin = await isSuperAdmin(user.id)
  const canUpdate = await can("asset-lease:update")
  const conditions: SQL[] = []

  if (!superAdmin) {
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
  const canUpdate = await can("asset-lease:update")

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
            columns: { id: true, name: true, path: true },
            orderBy: (photos, { asc }) => [asc(photos.createdAt)],
          },
          asset: {
            columns: { id: true, nomorAssets: true },
            with: {
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

  return { ...data, canDecide: canUpdate && data.status === "NEW" }
}

export type assetLeaseIndexType = Awaited<
  ReturnType<typeof assetLeaseIndex>
>["data"][0]
export type assetLeaseShowType = Awaited<ReturnType<typeof assetLeaseShow>>
