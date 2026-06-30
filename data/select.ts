import { createMemoryTracker } from "@/lib/debug/memory"
import { db } from "@/drizzle/db"
import { requireUser } from "./require-user"
import { and, asc, eq, ilike, isNotNull, ne, or, sql } from "drizzle-orm"
import {
  assetCodes,
  assetSpecs,
  branches,
  companies,
  prSpecifications,
  purchaseOrders,
  purchaseRequests,
  roleUser,
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
    orderBy: (menus, { asc }) => [
      asc(menus.createdAt),
      asc(menus.position),
    ],
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

export async function assetCodeSearchOptions(query: string, limit = 20) {
  await requireUser()

  const search = query.trim()

  if (search.length < 3) {
    return []
  }

  return db.query.assetCodes.findMany({
    columns: {
      id: true,
      categoryId: true,
      code: true,
      name: true,
    },
    where: or(
      ilike(assetCodes.code, `%${search}%`),
      ilike(assetCodes.name, `%${search}%`)
    ),
    orderBy: (assetCodes, { asc }) => [
      asc(assetCodes.code),
      asc(assetCodes.name),
    ],
    limit,
  })
}

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
  const memory = createMemoryTracker("assetSpecValueOptions")
  memory.mark("start")

  await requireUser()
  memory.mark("after-auth")

  const savedValues = await db
    .selectDistinct({
      specId: prSpecifications.specId,
      value: prSpecifications.specValue,
    })
    .from(prSpecifications)
    .where(
      and(
        isNotNull(prSpecifications.specValue),
        ne(prSpecifications.specValue, "")
      )
    )
    .orderBy(asc(prSpecifications.specValue))

  memory.mark("saved-values", { savedValues: savedValues.length })

  const selectSpecs = await db.query.assetSpecs.findMany({
    where: eq(assetSpecs.type, "SELECT"),
    columns: {
      id: true,
      dataTable: true,
    },
  })
  memory.mark("select-specs", { selectSpecs: selectSpecs.length })

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
      const rows = (result as unknown as { rows?: { name: string }[] }).rows ?? []

      dataTableValues.push(
        ...rows.map((row) => ({ specId: spec.id, value: row.name }))
      )
      memory.mark("data-table-values", {
        specId: spec.id,
        dataTable: spec.dataTable,
        rows: rows.length,
        dataTableValues: dataTableValues.length,
      })
    } catch {
      // Invalid data_table values should not break purchase request forms.
    }
  }

  const values = new Map<string, { specId: string; value: string }>()

  for (const option of [...savedValues, ...dataTableValues]) {
    if (!option.value) {
      continue
    }

    values.set(`${option.specId}:${option.value.toLowerCase()}`, {
      specId: option.specId,
      value: option.value,
    })
  }

  memory.mark("deduped-values", { values: values.size })

  const result = [...values.values()].sort((a, b) =>
    a.value.localeCompare(b.value)
  )

  memory.mark("finish", { result: result.length })

  return result
}
export type assetSpecValueOptionType = Awaited<
  ReturnType<typeof assetSpecValueOptions>
>[0]

export async function customerOptions() {
  await requireUser()

  return db.query.customers.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (customers, { asc }) => [asc(customers.createdAt)],
  })
}
export type customerOptionType = Awaited<ReturnType<typeof customerOptions>>[0]

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

export async function purchaseRequestOptionsForPurchaseOrder(
  currentPurchaseOrderId?: string
) {
  const user = await requireUser()

  const userRoles = await db.query.roleUser.findMany({
    where: and(eq(roleUser.userId, user.id), eq(roleUser.isActive, true)),
    with: {
      role: true,
    },
  })
  const isSuperAdmin = userRoles.some(
    (ur) => ur.role.name === "Super Administrator"
  )

  const currentPo = currentPurchaseOrderId
    ? await db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, currentPurchaseOrderId),
        columns: {
          prId: true,
          createdBy: true,
        },
      })
    : null

  if (currentPo && !isSuperAdmin && currentPo.createdBy !== user.id) {
    return []
  }

  const conditions = [eq(purchaseRequests.status, "APPROVED")]
  if (!isSuperAdmin) {
    conditions.push(eq(purchaseRequests.createdBy, user.id))
  }

  const purchaseRequestWhere = currentPo
    ? and(
        or(eq(purchaseRequests.id, currentPo.prId), and(...conditions))!,
        !isSuperAdmin ? eq(purchaseRequests.createdBy, user.id) : undefined
      )
    : and(...conditions)

  return db.query.purchaseRequests.findMany({
    where: purchaseRequestWhere,
    columns: {
      id: true,
      date: true,
      description: true,
      totalQuantity: true,
      totalAmount: true,
    },
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
export type purchaseRequestOptionForPurchaseOrderType = Awaited<
  ReturnType<typeof purchaseRequestOptionsForPurchaseOrder>
>[0]

export async function purchaseRequestDetailOptionsForPurchaseOrder(
  currentPurchaseOrderId?: string
) {
  const user = await requireUser()

  const userRoles = await db.query.roleUser.findMany({
    where: and(eq(roleUser.userId, user.id), eq(roleUser.isActive, true)),
    with: {
      role: true,
    },
  })
  const isSuperAdmin = userRoles.some(
    (ur) => ur.role.name === "Super Administrator"
  )

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

  if (currentPo && !isSuperAdmin && currentPo.createdBy !== user.id) {
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

      if (!isSuperAdmin && dtl.purchaseRequest.createdBy !== user.id) {
        return false
      }

      return true
    })
    .map((dtl) => {
      const orderedQuantity = dtl.purchaseOrderDetails
        .filter(
          (pod) => !currentPurchaseOrderId || pod.poId !== currentPurchaseOrderId
        )
        .reduce((sum, pod) => sum + (pod.quantity ?? 0), 0)

      const remainingQuantity = Math.max(0, (dtl.quantity ?? 0) - orderedQuantity)

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
export type purchaseRequestDetailOptionForPurchaseOrderType = Awaited<
  ReturnType<typeof purchaseRequestDetailOptionsForPurchaseOrder>
>[0]
