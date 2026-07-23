import "server-only"

import { db } from "@/drizzle/db"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"
import { modules } from "@/drizzle/schema"
import { count, eq, ilike } from "drizzle-orm"

export async function moduleIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("module:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(modules.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.modules.findMany({
      where,
      orderBy: (modules, { asc }) => [asc(modules.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(modules).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function moduleShow(id: string) {
  await requireUser()
  await requirePermission("module:read")

  const data = await db.query.modules.findFirst({
    where: eq(modules.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}
export type moduleShowType = Awaited<ReturnType<typeof moduleShow>>
