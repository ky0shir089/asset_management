import "server-only"

import { db } from "@/drizzle/db"
import { menus } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function menuIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("menu:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(menus.name, `%${search}%`) : undefined

  const [records, totalRecords] = await Promise.all([
    db.query.menus.findMany({
      where,
      with: {
        module: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: (menus, { asc }) => [
        asc(menus.createdAt),
        asc(menus.moduleId),
        asc(menus.position),
      ],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.query.menus.findMany({
      where,
      columns: {
        id: true,
      },
    }),
  ])

  const data = records.map(({ module, ...menu }) => ({
    ...menu,
    moduleName: module?.name ?? "",
  }))

  return paginatedResponse(data, totalRecords.length, pagination)
}

export async function menuShow(id: string) {
  await requireUser()
  await requirePermission("menu:read")

  const data = await db.query.menus.findFirst({
    where: eq(menus.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type menuShowType = Awaited<ReturnType<typeof menuShow>>
