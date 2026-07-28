import { db } from "@/drizzle/db"
import { requireUser } from "./require-user"
import { and, count, eq, inArray, isNotNull, ne, sql } from "drizzle-orm"
import {
  assetDatas,
  assetSpecs,
  branches,
  companies,
  outlets,
  purchaseOrders,
  purchaseRequests,
} from "@/drizzle/schema"

export async function moduleOptions() {
  await requireUser()

  return db.query.modules.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (modules, { asc }) => [asc(modules.position)],
  })
}
export type moduleOptionType = Awaited<ReturnType<typeof moduleOptions>>[0]

export async function menuOptions() {
  await requireUser()

  return db.query.menus.findMany({
    columns: {
      id: true,
      name: true,
    },
    with: {
      permissions: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: (menus, { asc }) => [asc(menus.createdAt), asc(menus.position)],
  })
}
export type menuOptionsType = Awaited<ReturnType<typeof menuOptions>>[0]

export async function roleOptions() {
  await requireUser()

  return db.query.roles.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (roles, { asc }) => [asc(roles.createdAt)],
  })
}
export type roleOptionType = Awaited<ReturnType<typeof roleOptions>>[0]

export async function companyOptions() {
  await requireUser()

  return db.query.companies.findMany({
    columns: {
      id: true,
      code: true,
    },
    where: eq(companies.isActive, true),

    orderBy: (companies, { asc }) => [asc(companies.createdAt)],
  })
}
export type companyOptionType = Awaited<ReturnType<typeof companyOptions>>[0]

export async function branchOptions() {
  await requireUser()

  return db.query.branches.findMany({
    columns: {
      id: true,
      name: true,
    },
    where: eq(branches.isActive, true),
    orderBy: (branches, { asc }) => [asc(branches.createdAt)],
  })
}
export type branchOptionType = Awaited<ReturnType<typeof branchOptions>>[0]

export async function assetCategoryOptions() {
  await requireUser()

  return db.query.assetCategories.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (assetCategories, { asc }) => [asc(assetCategories.createdAt)],
  })
}
export type assetCategoryOptionType = Awaited<
  ReturnType<typeof assetCategoryOptions>
>[0]

export async function assetCodeOptions() {
  await requireUser()

  return db.query.assetCodes.findMany({
    columns: {
      id: true,
      categoryId: true,
      code: true,
      name: true,
    },
    orderBy: (assetCodes, { asc }) => [asc(assetCodes.createdAt)],
  })
}
export type assetCodeOptionType = Awaited<
  ReturnType<typeof assetCodeOptions>
>[0]

export async function assetSpecOptions() {
  await requireUser()

  return db.query.assetSpecs.findMany({
    columns: {
      id: true,
      codeId: true,
      name: true,
      type: true,
      dataTable: true,
      isRequired: true,
      createable: true,
    },
    orderBy: (assetSpecs, { asc }) => [asc(assetSpecs.createdAt)],
  })
}
export type assetSpecOptionType = Awaited<
  ReturnType<typeof assetSpecOptions>
>[0]

function isSafeIdentifier(value: string) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)
}

export async function assetSpecValueOptions() {
  await requireUser()

  const selectSpecs = await db.query.assetSpecs.findMany({
    where: eq(assetSpecs.type, "SELECT"),
    columns: {
      id: true,
      dataTable: true,
    },
  })

  const dataTableValues: { specId: string; value: string }[] = []

  for (const spec of selectSpecs) {
    if (!spec.dataTable || !isSafeIdentifier(spec.dataTable)) {
      continue
    }

    try {
      const result = await db.execute(
        sql.raw(
          `select distinct "name" from "public"."${spec.dataTable}" where "name" is not null and "name" <> '' order by "name"`
        )
      )
      const rows =
        (result as unknown as { rows?: { name: string }[] }).rows ?? []

      dataTableValues.push(
        ...rows.map((row) => ({ specId: spec.id, value: row.name }))
      )
    } catch {
      // Invalid data_table values should not break purchase request forms.
    }
  }

  const values = new Map<string, { specId: string; value: string }>()

  for (const option of [...dataTableValues]) {
    if (!option.value) {
      continue
    }

    values.set(`${option.specId}:${option.value.toLowerCase()}`, {
      specId: option.specId,
      value: option.value,
    })
  }

  const result = [...values.values()].sort((a, b) =>
    a.value.localeCompare(b.value)
  )

  return result
}
export type assetSpecValueOptionType = Awaited<
  ReturnType<typeof assetSpecValueOptions>
>[0]

export async function bankOptions() {
  await requireUser()

  return db.query.banks.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (banks, { asc }) => [asc(banks.createdAt)],
  })
}
export type bankOptionType = Awaited<ReturnType<typeof bankOptions>>[0]

export async function supplierOptions() {
  await requireUser()

  return db.query.suppliers.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (suppliers, { asc }) => [asc(suppliers.createdAt)],
  })
}
export type supplierOptionType = Awaited<ReturnType<typeof supplierOptions>>[0]

export async function purchaseRequestOptions(id?: string) {
  await requireUser()

  return await db.query.purchaseRequests.findMany({
    where: and(
      eq(purchaseRequests.status, "APPROVED"),
      ne(purchaseRequests.poStatus, "COMPLETED"),
      id ? eq(purchaseRequests.id, id) : isNotNull(purchaseRequests.id)
    ),
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
    orderBy: (purchaseRequests, { desc }) => [desc(purchaseRequests.createdAt)],
  })
}
export type purchaseRequestOptionType = Awaited<
  ReturnType<typeof purchaseRequestOptions>
>[0]

export async function purchaseRequestDetailOptions(
  currentPurchaseOrderId?: string
) {
  await requireUser()

  const currentPo = currentPurchaseOrderId
    ? await db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, currentPurchaseOrderId),
        columns: {
          id: true,
          prId: true,
          createdBy: true,
        },
      })
    : null

  if (currentPo) {
    return []
  }

  const prs = await db.query.prDetails.findMany({
    with: {
      purchaseRequest: {
        columns: {
          id: true,
          status: true,
          createdBy: true,
        },
      },
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
      purchaseOrderDetails: true,
    },
  })

  return prs
    .filter((dtl) => {
      if (dtl.purchaseRequest.status !== "APPROVED") {
        return false
      }

      return true
    })
    .map((dtl) => {
      const orderedQuantity = dtl.purchaseOrderDetails
        .filter(
          (pod) =>
            !currentPurchaseOrderId || pod.poId !== currentPurchaseOrderId
        )
        .reduce((sum, pod) => sum + (pod.quantity ?? 0), 0)

      const remainingQuantity = Math.max(
        0,
        (dtl.quantity ?? 0) - orderedQuantity
      )

      return {
        id: dtl.id,
        prId: dtl.prId,
        quantity: dtl.quantity ?? 0,
        price: dtl.price ?? 0,
        orderedQuantity,
        remainingQuantity,
        assetCode: dtl.assetCode,
        specifications: dtl.specifications.map((s) => ({
          id: s.id,
          specId: s.specId,
          specName: s.spec?.name ?? "",
          specValue: s.specValue,
        })),
      }
    })
}
export type purchaseRequestDetailOptionType = Awaited<
  ReturnType<typeof purchaseRequestDetailOptions>
>[0]

export async function outletOptions() {
  await requireUser()

  return db.query.outlets.findMany({
    where: eq(outlets.isActive, true),
    with: {
      branch: {
        columns: {
          id: true,
          companyId: true,
          name: true,
        },
      },
    },
    orderBy: (outlets, { asc }) => [asc(outlets.name)],
  })
}
export type outletOptionType = Awaited<ReturnType<typeof outletOptions>>[0]

export async function assetLeaseCompanyOptions() {
  await requireUser()

  return db.query.companies.findMany({
    columns: {
      id: true,
      code: true,
      name: true,
    },
    where: and(eq(companies.isActive, true), ne(companies.code, "LSA")),
    orderBy: (companies, { asc }) => [asc(companies.name)],
  })
}
export type assetLeaseCompanyOptionType = Awaited<
  ReturnType<typeof assetLeaseCompanyOptions>
>[0]

export async function assetLeaseAssetOptions() {
  await requireUser()

  const lsaOutletIds = db
    .select({ id: outlets.id })
    .from(outlets)
    .innerJoin(branches, eq(outlets.branchId, branches.id))
    .innerJoin(companies, eq(branches.companyId, companies.id))
    .where(eq(companies.code, "LSA"))

  const rows = await db.query.assetDatas.findMany({
    columns: {
      id: true,
      nomorAssets: true,
      outletId: true,
    },
    where: and(
      eq(assetDatas.status, "TERSEDIA"),
      inArray(assetDatas.outletId, lsaOutletIds)
    ),
    with: {
      poDetail: {
        with: {
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
    },
    orderBy: (assetDatas, { asc }) => [asc(assetDatas.nomorAssets)],
  })

  return rows.map((row) => ({
    id: row.id,
    nomorAssets: row.nomorAssets,
    outletId: row.outletId,
    assetCode: row.poDetail?.prDetail?.assetCode ?? null,
  }))
}
export type assetLeaseAssetOptionType = Awaited<
  ReturnType<typeof assetLeaseAssetOptions>
>[0]

export async function purchaseOrderDetailOptionsForReceivedAsset() {
  await requireUser()

  const podetails = await db.query.poDetails.findMany({
    with: {
      purchaseOrder: {
        columns: {
          id: true,
          poNo: true,
          date: true,
          description: true,
          status: true,
          createdBy: true,
        },
        with: {
          purchaseRequest: {
            columns: {
              id: true,
              date: true,
              companyId: true,
            },
            with: {
              company: {
                columns: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      prDetail: {
        columns: {
          id: true,
          quantity: true,
          price: true,
        },
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
          purchaseOrderDetails: {
            columns: {
              id: true,
              quantity: true,
            },
          },
        },
      },
    },
  })

  const receivedCounts = await db
    .select({
      poDetailId: assetDatas.poDetailId,
      count: count(),
    })
    .from(assetDatas)
    .groupBy(assetDatas.poDetailId)

  const receivedCountMap = new Map(
    receivedCounts.map((r) => [r.poDetailId, r.count])
  )

  return podetails.map((pod) => {
    const orderedQuantity = pod.quantity ?? 0
    const alreadyReceived = receivedCountMap.get(pod.id) ?? 0
    const remainingQuantity = Math.max(0, orderedQuantity - alreadyReceived)

    return {
      id: pod.id,
      poId: pod.poId,
      poNo: pod.purchaseOrder.poNo,
      poDate: pod.purchaseOrder.date,
      poDescription: pod.purchaseOrder.description,
      poStatus: pod.purchaseOrder.status,
      createdBy: pod.purchaseOrder.createdBy,
      company: pod.purchaseOrder.purchaseRequest.company,
      quantity: orderedQuantity,
      receivedQuantity: alreadyReceived,
      remainingQuantity,
      assetCode: pod.prDetail?.assetCode ?? null,
      specifications:
        pod.prDetail?.specifications?.map((s) => ({
          id: s.id,
          specId: s.specId,
          specName: s.spec?.name ?? "",
          specValue: s.specValue,
        })) ?? [],
    }
  })
}
export type purchaseOrderDetailOptionForReceiveType = Awaited<
  ReturnType<typeof purchaseOrderDetailOptionsForReceivedAsset>
>[0]
