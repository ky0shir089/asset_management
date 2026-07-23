import "server-only"

import { db } from "@/drizzle/db"
import { banks } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function bankIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("bank:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(banks.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.banks.findMany({
      where,
      orderBy: (banks, { asc }) => [asc(banks.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(banks).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function bankShow(id: string) {
  await requireUser()
  await requirePermission("bank:read")

  const data = await db.query.banks.findFirst({
    where: eq(banks.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type bankIndexType = Awaited<ReturnType<typeof bankIndex>>["data"][0]
export type bankShowType = Awaited<ReturnType<typeof bankShow>>
