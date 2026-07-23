import "server-only"

import { db } from "@/drizzle/db"
import { outlets } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function outletIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("outlet:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(outlets.name, `%${search}%`) : undefined

  const [data, totalRecords] = await Promise.all([
    db.query.outlets.findMany({
      where,
      with: {
        branch: {
          columns: {
            branchId: true,
            name: true,
          },
          with: {
            company: {
              columns: {
                code: true,
              },
            },
          },
        },
      },
      orderBy: (outlets, { asc }) => [asc(outlets.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.query.outlets.findMany({
      where,
      columns: {
        id: true,
      },
    }),
  ])

  return paginatedResponse(data, totalRecords.length, pagination)
}

export async function outletShow(id: string) {
  await requireUser()
  await requirePermission("outlet:read")

  const data = await db.query.outlets.findFirst({
    where: eq(outlets.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type outletIndexType = Awaited<ReturnType<typeof outletIndex>>["data"][0]
export type outletShowType = Awaited<ReturnType<typeof outletShow>>
