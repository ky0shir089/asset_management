import "server-only"

import { db } from "@/drizzle/db"
import {
  assetCategories,
  companies,
  purchaseRequests,
  roleUser,
} from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { and, count, eq, ilike, inArray, or } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

async function isSuperAdmin(userId: string) {
  const userRoles = await db.query.roleUser.findMany({
    where: and(eq(roleUser.userId, userId), eq(roleUser.isActive, true)),
    with: {
      role: true,
    },
  })

  return userRoles.some((ur) => ur.role.name === "Super Administrator")
}

export async function purchaseRequestIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("purchase-request:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const superAdmin = await isSuperAdmin(user.id)

  const conditions = []

  if (!superAdmin) {
    conditions.push(eq(purchaseRequests.createdBy, user.id))
  }

  if (search) {
    const searchPattern = `%${search}%`

    conditions.push(
      or(
        ilike(purchaseRequests.description, searchPattern),
        ilike(purchaseRequests.status, searchPattern),
        inArray(
          purchaseRequests.companyId,
          db
            .select({ id: companies.id })
            .from(companies)
            .where(ilike(companies.code, searchPattern))
        ),
        inArray(
          purchaseRequests.assetCategoryId,
          db
            .select({ id: assetCategories.id })
            .from(assetCategories)
            .where(ilike(assetCategories.name, searchPattern))
        )
      )!
    )
  }

  const where = conditions.length ? and(...conditions) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.purchaseRequests.findMany({
      where,
      with: {
        company: {
          columns: {
            code: true,
          },
        },
        assetCategory: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: (purchaseRequests, { desc }) => [
        desc(purchaseRequests.createdAt),
      ],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(purchaseRequests).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function purchaseRequestShow(id: string) {
  const user = await requireUser()
  await requirePermission("purchase-request:read")

  const data = await db.query.purchaseRequests.findFirst({
    where: eq(purchaseRequests.id, id),
    with: {
      company: {
        columns: {
          code: true,
        },
      },
      assetCategory: {
        columns: {
          name: true,
        },
      },
      details: {
        with: {
          assetCode: {
            columns: {
              id: true,
              code: true,
              name: true,
            },
          },
          specifications: {
            with: {
              spec: {
                columns: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: (details, { asc }) => [asc(details.createdAt)],
      },
    },
  })

  if (!data) {
    notFound()
  }

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin && data.createdBy !== user.id) {
    notFound()
  }

  return data
}

export type purchaseRequestIndexType = Awaited<
  ReturnType<typeof purchaseRequestIndex>
>["data"][0]
export type purchaseRequestShowType = Awaited<
  ReturnType<typeof purchaseRequestShow>
>
