import "server-only"

import { db } from "@/drizzle/db"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"
import { roles } from "@/drizzle/schema"

export async function roleIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("role:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(roles.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.roles.findMany({
      where,
      orderBy: (roles, { asc }) => [asc(roles.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(roles).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}
export type roleIndexType = Awaited<
  ReturnType<typeof roleIndex>
>["data"][number]

export async function roleShow(id: string) {
  await requireUser()
  await requirePermission("role:read")

  const data = await db.query.roles.findFirst({
    with: {
      menuRoles: true,
      permissionRoles: true,
    },
    where: eq(roles.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type roleShowType = Awaited<ReturnType<typeof roleShow>>
