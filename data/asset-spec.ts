import "server-only"

import { db } from "@/drizzle/db"
import { assetSpecs } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function assetSpecIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("asset-specification:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(assetSpecs.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.assetSpecs.findMany({
      where,
      with: {
        code: {
          columns: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: (assetSpecs, { asc }) => [asc(assetSpecs.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(assetSpecs).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function assetSpecShow(id: string) {
  await requireUser()
  await requirePermission("asset-specification:read")

  const data = await db.query.assetSpecs.findFirst({
    where: eq(assetSpecs.id, id),
    with: {
      code: {
        columns: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  })

  if (!data) {
    notFound()
  }

  return data
}

export type assetSpecIndexType = Awaited<ReturnType<typeof assetSpecIndex>>["data"][0]
export type assetSpecShowType = Awaited<ReturnType<typeof assetSpecShow>>
