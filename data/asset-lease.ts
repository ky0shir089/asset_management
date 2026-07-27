import "server-only"

import { db } from "@/drizzle/db"
import { outlets, rentAssets } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { and, count, eq, ilike, inArray } from "drizzle-orm"
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
  const conditions = []

  if (!superAdmin) {
    conditions.push(eq(rentAssets.createdBy, user.id))
  }

  if (search) {
    conditions.push(
      inArray(
        rentAssets.outletId,
        db
          .select({ id: outlets.id })
          .from(outlets)
          .where(ilike(outlets.name, `%${search}%`))
      )
    )
  }

  const where = conditions.length ? and(...conditions) : undefined
  const [data, [{ count: total }]] = await Promise.all([
    db.query.rentAssets.findMany({
      where,
      with: {
        outlet: {
          columns: { name: true },
        },
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

  const data = await db.query.rentAssets.findFirst({
    where: eq(rentAssets.id, rentId),
    with: {
      outlet: {
        columns: { id: true, name: true },
      },
      details: {
        orderBy: (details, { asc }) => [asc(details.id)],
        with: {
          customer: {
            columns: { id: true, name: true },
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
  if (!superAdmin && data.createdBy !== user.id) {
    notFound()
  }

  return data
}

export type assetLeaseIndexType = Awaited<
  ReturnType<typeof assetLeaseIndex>
>["data"][0]
export type assetLeaseShowType = Awaited<ReturnType<typeof assetLeaseShow>>
