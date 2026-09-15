import "server-only"

import { db } from "@/drizzle/db"
import { purchaseOrders } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { and, count, eq, ilike, or } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function purchaseOrderIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("purchase-order:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()

  const conditions = []

  if (user.role !== "Super Administrator" && user.role !== "Admin GA") {
    conditions.push(eq(purchaseOrders.createdBy, user.id))
  }

  if (search) {
    conditions.push(
      or(
        ilike(purchaseOrders.description, `%${search}%`),
        ilike(purchaseOrders.status, `%${search}%`)
      )!
    )
  }

  const where = conditions.length ? and(...conditions) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.purchaseOrders.findMany({
      where,
      with: {
        purchaseRequest: {
          columns: {
            prNo: true,
          },
        },
        supplier: {
          columns: {
            name: true,
          },
        },
        details: {
          columns: {
            id: true,
            quantity: true,
            price: true,
            total: true,
          },
        },
      },
      orderBy: (purchaseOrders, { desc }) => [desc(purchaseOrders.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(purchaseOrders).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function purchaseOrderShow(id: string) {
  const user = await requireUser()
  await requirePermission("purchase-order:read")

  const data = await db.query.purchaseOrders.findFirst({
    where: eq(purchaseOrders.id, id),
    with: {
      supplier: {
        columns: {
          id: true,
          name: true,
          address: true,
        },
        with: {
          village: {
            columns: { name: true, postalCode: true },
            with: {
              district: { columns: { name: true } },
              regency: { columns: { name: true } },
              province: { columns: { name: true } },
            },
          },
        },
      },
      supplierAccount: {
        columns: {
          id: true,
          accountNo: true,
          accountName: true,
        },
        with: {
          bank: {
            columns: {
              name: true,
            },
          },
        },
      },
      purchaseRequest: {
        columns: {
          id: true,
          prNo: true,
          date: true,
          description: true,
        },
      },
      details: {
        with: {
          prDetail: {
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

export type purchaseOrderIndexType = Awaited<
  ReturnType<typeof purchaseOrderIndex>
>["data"][0]
export type purchaseOrderShowType = Awaited<
  ReturnType<typeof purchaseOrderShow>
>
