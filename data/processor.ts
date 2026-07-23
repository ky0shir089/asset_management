import "server-only"

import { db } from "@/drizzle/db"
import { processors } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function processorIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("processor:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(processors.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.processors.findMany({
      where,
      orderBy: (processors, { asc }) => [asc(processors.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(processors).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function processorShow(id: string) {
  await requireUser()
  await requirePermission("processor:read")

  const data = await db.query.processors.findFirst({
    where: eq(processors.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type processorIndexType = Awaited<
  ReturnType<typeof processorIndex>
>["data"][0]
export type processorShowType = Awaited<ReturnType<typeof processorShow>>
