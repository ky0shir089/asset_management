import "server-only"

import { db } from "@/drizzle/db"
import { assetBrands } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function assetBrandIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("asset-brand:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(assetBrands.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.assetBrands.findMany({
      where,
      orderBy: (assetBrands, { asc }) => [asc(assetBrands.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(assetBrands).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function assetBrandShow(id: string) {
  await requireUser()
  await requirePermission("asset-brand:read")

  const data = await db.query.assetBrands.findFirst({
    where: eq(assetBrands.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type assetBrandIndexType = Awaited<ReturnType<typeof assetBrandIndex>>["data"][0]
export type assetBrandShowType = Awaited<ReturnType<typeof assetBrandShow>>
