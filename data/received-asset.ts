import "server-only"

import { assetDatas } from "@/drizzle/schema"
import { db } from "@/drizzle/db"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { and, count, eq, ilike, or } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function receivedAssetIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("received-asset:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const superAdmin = await isSuperAdmin(user.id)

  const searchConditions = []

  if (!superAdmin) {
    searchConditions.push(eq(assetDatas.createdBy, user.id))
  }

  if (search) {
    searchConditions.push(
      or(
        ilike(assetDatas.nomorAssets, `%${search}%`),
        ilike(assetDatas.status, `%${search}%`),
        ilike(assetDatas.condition, `%${search}%`)
      )!
    )
  }

  const where = searchConditions.length
    ? and(...searchConditions)
    : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.assetDatas.findMany({
      where,
      with: {
        poDetail: {
          with: {
            purchaseOrder: {
              with: {
                purchaseRequest: {
                  with: {
                    company: {
                      columns: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
            prDetail: {
              with: {
                assetCode: {
                  columns: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        outlet: {
          columns: {
            id: true,
            outletId: true,
            name: true,
          },
        },
      },
      orderBy: (assetDatas, { desc }) => [
        desc(assetDatas.createdAt),
      ],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(assetDatas).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function receivedAssetShow(id: string) {
  const user = await requireUser()
  await requirePermission("received-asset:read")

  const data = await db.query.assetDatas.findFirst({
    where: eq(assetDatas.id, id),
    with: {
      poDetail: {
        columns: {
          id: true,
          quantity: true,
          price: true,
        },
        with: {
          purchaseOrder: {
            columns: {
              id: true,
              poNo: true,
              date: true,
              description: true,
              status: true,
            },
            with: {
              purchaseRequest: {
                columns: {
                  id: true,
                  date: true,
                },
                with: {
                  company: {
                    columns: {
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
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
      },
      outlet: {
        columns: {
          id: true,
          outletId: true,
          name: true,
        },
        with: {
          branch: {
            columns: {
              name: true,
            },
          },
        },
      },
      photos: {
        columns: {
          id: true,
          name: true,
          path: true,
        },
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

export type receivedAssetIndexType = Awaited<
  ReturnType<typeof receivedAssetIndex>
>["data"][0]
