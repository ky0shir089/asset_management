import "server-only"

import { db } from "@/drizzle/db"
import { rams } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function ramIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("ram:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(rams.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.rams.findMany({
      where,
      orderBy: (rams, { asc }) => [asc(rams.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(rams).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function ramShow(id: string) {
  await requireUser()
  await requirePermission("ram:read")

  const data = await db.query.rams.findFirst({
    where: eq(rams.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type ramIndexType = Awaited<ReturnType<typeof ramIndex>>["data"][0]
export type ramShowType = Awaited<ReturnType<typeof ramShow>>
