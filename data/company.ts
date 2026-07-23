import "server-only"

import { db } from "@/drizzle/db"
import { companies } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function companyIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("company:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(companies.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.companies.findMany({
      where,
      orderBy: (companies, { asc }) => [asc(companies.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(companies).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function companyShow(id: string) {
  await requireUser()
  await requirePermission("company:read")

  const data = await db.query.companies.findFirst({
    where: eq(companies.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type companyIndexType = Awaited<ReturnType<typeof companyIndex>>["data"][0]
export type companyShowType = Awaited<ReturnType<typeof companyShow>>
