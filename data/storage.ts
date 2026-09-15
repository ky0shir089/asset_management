import "server-only"

import { db } from "@/drizzle/db"
import { storages } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function storageIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("storage:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(storages.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.storages.findMany({
      where,
      orderBy: (storages, { asc }) => [asc(storages.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(storages).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function storageShow(id: string) {
  await requireUser()
  await requirePermission("storage:read")

  const data = await db.query.storages.findFirst({
    where: eq(storages.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type storageIndexType = Awaited<ReturnType<typeof storageIndex>>["data"][0]
export type storageShowType = Awaited<ReturnType<typeof storageShow>>
