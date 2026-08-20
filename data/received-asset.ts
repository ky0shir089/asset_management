import "server-only"

import {
  assetCategories,
  assetCodes,
  assetDatas,
  assetTransfers,
  companies,
  outlets,
  poDetails,
  prDetails,
  purchaseOrders,
  purchaseRequests,
  users,
} from "@/drizzle/schema"
import { db } from "@/drizzle/db"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm"
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
    const pattern = `%${search}%`

    searchConditions.push(
      or(
        ilike(assetDatas.nomorAssets, pattern),
        ilike(assetDatas.status, pattern),
        ilike(sql`${assetDatas.condition}::text`, pattern),
        inArray(
          assetDatas.poDetailId,
          db
            .select({ id: poDetails.id })
            .from(poDetails)
            .innerJoin(purchaseOrders, eq(poDetails.poId, purchaseOrders.id))
            .innerJoin(
              purchaseRequests,
              eq(purchaseOrders.prId, purchaseRequests.id)
            )
            .innerJoin(companies, eq(purchaseRequests.companyId, companies.id))
            .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
            .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
            .where(
              or(
                ilike(companies.code, pattern),
                ilike(assetCodes.name, pattern)
              )
            )
        ),
        inArray(
          assetDatas.outletId,
          db
            .select({ id: outlets.id })
            .from(outlets)
            .where(ilike(outlets.name, pattern))
        )
      )!
    )
  }

  const where = searchConditions.length ? and(...searchConditions) : undefined

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
      orderBy: (assetDatas, { desc }) => [desc(assetDatas.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(assetDatas).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export interface ListAssetsFilters {
  nomorAsset?: string
  assetCode?: string
  location?: string
  user?: string
  status?: string
}

export async function listAssetsIndex(
  currentPage: number,
  size: number,
  filters: ListAssetsFilters
) {
  const user = await requireUser()
  await requirePermission("received-asset:browse")

  const pagination = paginationParams(currentPage, size)
  const superAdmin = await isSuperAdmin(user.id)
  const conditions = [isNotNull(poDetails.price)]

  if (!superAdmin) {
    conditions.push(eq(assetDatas.createdBy, user.id))
  }

  const nomorAsset = filters.nomorAsset?.trim()
  const assetCode = filters.assetCode?.trim()
  const location = filters.location?.trim()
  const recipient = filters.user?.trim()
  const status = filters.status?.trim()

  if (nomorAsset) {
    conditions.push(ilike(assetDatas.nomorAssets, `%${nomorAsset}%`))
  }
  if (assetCode) {
    conditions.push(ilike(assetCodes.name, `%${assetCode}%`))
  }
  if (location) {
    conditions.push(ilike(outlets.name, `%${location}%`))
  }
  if (recipient) {
    conditions.push(ilike(users.name, `%${recipient}%`))
  }
  if (status) {
    conditions.push(eq(assetDatas.status, status))
  }

  const latestReceivedTransfer = db
    .selectDistinctOn([assetTransfers.assetId], {
      assetId: assetTransfers.assetId,
      userId: assetTransfers.userId,
    })
    .from(assetTransfers)
    .where(eq(assetTransfers.status, "RECEIVED"))
    .orderBy(
      assetTransfers.assetId,
      desc(assetTransfers.createdAt),
      desc(assetTransfers.id)
    )
    .as("latest_received_transfer")

  const where = and(...conditions)
  const baseQuery = () =>
    db
      .select({
        id: assetDatas.id,
        assetNumber: assetDatas.nomorAssets,
        categoryName: assetCategories.name,
        assetCodeName: assetCodes.name,
        outletName: outlets.name,
        purchasePrice: poDetails.price,
        recipientName: users.name,
        status: assetDatas.status,
      })
      .from(assetDatas)
      .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
      .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
      .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
      .innerJoin(assetCategories, eq(assetCodes.categoryId, assetCategories.id))
      .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
      .leftJoin(
        latestReceivedTransfer,
        eq(assetDatas.id, latestReceivedTransfer.assetId)
      )
      .leftJoin(users, eq(latestReceivedTransfer.userId, users.id))
      .where(where)

  const [data, [{ count: total }]] = await Promise.all([
    baseQuery()
      .orderBy(desc(assetDatas.createdAt), desc(assetDatas.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    db
      .select({ count: count() })
      .from(assetDatas)
      .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
      .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
      .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
      .innerJoin(assetCategories, eq(assetCodes.categoryId, assetCategories.id))
      .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
      .leftJoin(
        latestReceivedTransfer,
        eq(assetDatas.id, latestReceivedTransfer.assetId)
      )
      .leftJoin(users, eq(latestReceivedTransfer.userId, users.id))
      .where(where),
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
export type listAssetsIndexType = Awaited<
  ReturnType<typeof listAssetsIndex>
>["data"][0]
