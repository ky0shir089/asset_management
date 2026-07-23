import "server-only"

import { db } from "@/drizzle/db"
import { assetCategories } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function assetCategoryIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("asset-category:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(assetCategories.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.assetCategories.findMany({
      where,
      orderBy: (assetCategories, { asc }) => [asc(assetCategories.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(assetCategories).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function assetCategoryShow(id: string) {
  await requireUser()
  await requirePermission("asset-category:read")

  const data = await db.query.assetCategories.findFirst({
    where: eq(assetCategories.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type assetCategoryIndexType = Awaited<
  ReturnType<typeof assetCategoryIndex>
>["data"][0]
export type assetCategoryShowType = Awaited<ReturnType<typeof assetCategoryShow>>
