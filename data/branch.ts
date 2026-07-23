import "server-only"

import { db } from "@/drizzle/db"
import { branches } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function branchIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("branch:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(branches.name, `%${search}%`) : undefined

  const [data, totalRecords] = await Promise.all([
    db.query.branches.findMany({
      where,
      with: {
        company: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: (branches, { asc }) => [asc(branches.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.query.branches.findMany({
      where,
      columns: {
        id: true,
      },
    }),
  ])

  return paginatedResponse(data, totalRecords.length, pagination)
}

export async function branchShow(id: string) {
  await requireUser()
  await requirePermission("branch:read")

  const data = await db.query.branches.findFirst({
    where: eq(branches.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type branchIndexType = Awaited<ReturnType<typeof branchIndex>>["data"][0]
export type branchShowType = Awaited<ReturnType<typeof branchShow>>
