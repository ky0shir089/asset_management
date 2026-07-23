import "server-only"

import { db } from "@/drizzle/db"
import { assetCodes } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike, or } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function assetCodeIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("asset-code:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search
    ? or(
        ilike(assetCodes.code, `%${search}%`),
        ilike(assetCodes.name, `%${search}%`)
      )
    : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.assetCodes.findMany({
      where,
      with: {
        category: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: (assetCodes, { asc }) => [asc(assetCodes.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(assetCodes).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function assetCodeShow(id: string) {
  await requireUser()
  await requirePermission("asset-code:read")

  const data = await db.query.assetCodes.findFirst({
    where: eq(assetCodes.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type assetCodeIndexType = Awaited<
  ReturnType<typeof assetCodeIndex>
>["data"][0]
export type assetCodeShowType = Awaited<ReturnType<typeof assetCodeShow>>
