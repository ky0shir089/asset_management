import "server-only"

import { db } from "@/drizzle/db"
import { suppliers } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function supplierIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("supplier:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(suppliers.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.suppliers.findMany({
      where,
      with: {
        accounts: {
          with: {
            bank: {
              columns: {
                name: true,
              },
            },
          },
          orderBy: (accounts, { asc }) => [asc(accounts.createdAt)],
        },
      },
      orderBy: (suppliers, { asc }) => [asc(suppliers.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(suppliers).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function supplierShow(id: string) {
  await requireUser()
  await requirePermission("supplier:read")

  const data = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, id),
    with: {
      accounts: {
        with: {
          bank: {
            columns: {
              name: true,
            },
          },
        },
        orderBy: (accounts, { asc }) => [asc(accounts.createdAt)],
      },
    },
  })

  if (!data) {
    notFound()
  }

  return data
}

export type supplierIndexType = Awaited<ReturnType<typeof supplierIndex>>["data"][0]
export type supplierShowType = Awaited<ReturnType<typeof supplierShow>>
