import "server-only"

import { db } from "@/drizzle/db"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"
import { users } from "@/drizzle/schema"
import { count, eq, ilike } from "drizzle-orm"

export async function userIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("user:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(users.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.users.findMany({
      where,
      with: {
        roleUser: {
          with: {
            role: true,
          },
        },
      },
      orderBy: (users, { asc }) => [asc(users.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(users).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function userShow(id: string) {
  await requireUser()
  await requirePermission("user:read")

  const data = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      roleUser: {
        with: {
          role: true,
        },
      },
    },
  })

  if (!data) {
    notFound()
  }

  return data
}
export type userShowType = Awaited<ReturnType<typeof userShow>>
