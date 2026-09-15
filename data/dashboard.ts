import "server-only"

import { db } from "@/drizzle/db"
import {
  assetCodes,
  assetDatas,
  assetTransfers,
  branches,
  companies,
  outlets,
  poDetails,
  prDetails,
  purchaseOrders,
  purchaseRequests,
  rentAssetDetails,
  rentAssets,
  users,
} from "@/drizzle/schema"
import { getSessionPermissions } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { and, asc, desc, eq, isNull, sql, type SQLWrapper } from "drizzle-orm"
import { z } from "zod"
import { requireUser } from "./require-user"

type DashboardLocation = {
  id: string
  name: string
  code: string
  assetCount: number
  branches: {
    id: string
    name: string
    assetCount: number
    outlets: {
      id: string
      name: string
      assetCount: number
    }[]
  }[]
}

export type DashboardFilterInput = {
  year?: string
  month?: string
  companyId?: string
  branchId?: string
  outletId?: string
  assetCodeId?: string
  assetStatus?: string
}

type DashboardFilters = {
  year?: number
  month?: number
  companyId?: string
  branchId?: string
  outletId?: string
  assetCodeId?: string
  assetStatus?: string
}

const uuidSchema = z.uuid()
const statusSchema = z.string().trim().min(1).max(255)
const statusLabels: Record<string, string> = {
  TERSEDIA: "Available",
  BOOKED: "Booked",
  DIGUNAKAN: "Leased",
}

function parseOptionId(
  value: string | undefined,
  options: ReadonlyMap<string, unknown>
) {
  const result = uuidSchema.safeParse(value?.toLowerCase())
  return result.success && options.has(result.data) ? result.data : undefined
}

function periodConditions(column: SQLWrapper, filters: DashboardFilters) {
  return [
    filters.year
      ? sql`extract(year from ${column}) = ${filters.year}`
      : undefined,
    filters.month
      ? sql`extract(month from ${column}) = ${filters.month}`
      : undefined,
  ]
}

function assetConditions(filters: DashboardFilters) {
  return [
    filters.companyId ? eq(companies.id, filters.companyId) : undefined,
    filters.branchId ? eq(branches.id, filters.branchId) : undefined,
    filters.outletId ? eq(outlets.id, filters.outletId) : undefined,
    filters.assetCodeId ? eq(assetCodes.id, filters.assetCodeId) : undefined,
    filters.assetStatus
      ? eq(assetDatas.status, filters.assetStatus)
      : undefined,
  ]
}

function requestAssetCodeCondition(assetCodeId?: string) {
  return assetCodeId
    ? sql`exists (
        select 1
        from ${prDetails}
        where ${prDetails.prId} = ${purchaseRequests.id}
          and ${prDetails.assetCodeId} = ${assetCodeId}
      )`
    : undefined
}

function orderAssetCodeCondition(assetCodeId?: string) {
  return assetCodeId
    ? sql`exists (
        select 1
        from ${poDetails}
        inner join ${prDetails} on ${poDetails.prDtlId} = ${prDetails.id}
        where ${poDetails.poId} = ${purchaseOrders.id}
          and ${prDetails.assetCodeId} = ${assetCodeId}
      )`
    : undefined
}

function leaseAssetCondition(filters: DashboardFilters) {
  const conditions = [
    filters.branchId ? eq(branches.id, filters.branchId) : undefined,
    filters.outletId ? eq(outlets.id, filters.outletId) : undefined,
    filters.assetCodeId ? eq(assetCodes.id, filters.assetCodeId) : undefined,
    filters.assetStatus
      ? eq(assetDatas.status, filters.assetStatus)
      : undefined,
  ]

  if (conditions.every((condition) => condition === undefined)) {
    return undefined
  }

  return sql`exists (
    select 1
    from ${rentAssetDetails}
    inner join ${assetDatas} on ${rentAssetDetails.assetId} = ${assetDatas.id}
    inner join ${poDetails} on ${assetDatas.poDetailId} = ${poDetails.id}
    inner join ${prDetails} on ${poDetails.prDtlId} = ${prDetails.id}
    inner join ${assetCodes} on ${prDetails.assetCodeId} = ${assetCodes.id}
    inner join ${outlets} on ${assetDatas.outletId} = ${outlets.id}
    inner join ${branches} on ${outlets.branchId} = ${branches.branchId}
    where ${rentAssetDetails.rentAssetId} = ${rentAssets.id}
      and ${and(...conditions)}
  )`
}

const assetOptionColumns = {
  companyId: companies.id,
  companyName: companies.name,
  companyCode: companies.code,
  branchId: branches.id,
  branchName: branches.name,
  outletId: outlets.id,
  outletName: outlets.name,
  assetCodeId: assetCodes.id,
  assetCode: assetCodes.code,
  assetCodeName: assetCodes.name,
  assetStatus: assetDatas.status,
}

const requestOptionColumns = {
  companyId: companies.id,
  companyName: companies.name,
  companyCode: companies.code,
  branchId: sql<string | null>`null`,
  branchName: sql<string | null>`null`,
  outletId: sql<string | null>`null`,
  outletName: sql<string | null>`null`,
  assetCodeId: assetCodes.id,
  assetCode: assetCodes.code,
  assetCodeName: assetCodes.name,
  assetStatus: sql<string | null>`null`,
}

const companyOptionColumns = {
  companyId: companies.id,
  companyName: companies.name,
  companyCode: companies.code,
  branchId: sql<string | null>`null`,
  branchName: sql<string | null>`null`,
  outletId: sql<string | null>`null`,
  outletName: sql<string | null>`null`,
  assetCodeId: sql<string | null>`null`,
  assetCode: sql<string | null>`null`,
  assetCodeName: sql<string | null>`null`,
  assetStatus: sql<string | null>`null`,
}

export async function getDashboardData(input: DashboardFilterInput = {}) {
  const [user, permissionNames] = await Promise.all([
    requireUser(),
    getSessionPermissions(),
  ])
  const superAdmin = await isSuperAdmin(user.id)
  const permissions = new Set(permissionNames)

  const canBrowseInventory = permissions.has("received-asset:browse")
  const canBrowsePurchaseRequests = permissions.has("purchase-request:browse")
  const canBrowsePurchaseOrders = permissions.has("purchase-order:browse")
  const canApprovePurchaseRequests =
    permissions.has("purchase-request:read") &&
    permissions.has("purchase-request:update")
  const canApproveLeases =
    permissions.has("asset-lease:browse") &&
    permissions.has("asset-lease:read") &&
    permissions.has("asset-lease:update")
  const canBrowseTransfers = permissions.has("asset-transfer:browse")
  const canReadTransfers = permissions.has("asset-transfer:read")
  const inventoryScope = superAdmin
    ? undefined
    : eq(assetDatas.createdBy, user.id)
  const purchaseRequestScope = superAdmin
    ? undefined
    : eq(purchaseRequests.createdBy, user.id)
  const purchaseOrderScope = superAdmin
    ? undefined
    : eq(purchaseOrders.createdBy, user.id)
  const transferReceiptScope = superAdmin
    ? undefined
    : eq(assetTransfers.userId, user.id)
  const recentTransferScope = superAdmin
    ? undefined
    : eq(assetTransfers.createdBy, user.id)

  const optionGroups = await Promise.all([
    canBrowseInventory
      ? db
          .selectDistinct(assetOptionColumns)
          .from(assetDatas)
          .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(
            companies,
            eq(branches.companyId, companies.talentaCompanyId)
          )
          .where(inventoryScope)
      : Promise.resolve(null),
    canBrowsePurchaseRequests
      ? db
          .selectDistinct(requestOptionColumns)
          .from(purchaseRequests)
          .innerJoin(companies, eq(purchaseRequests.companyId, companies.id))
          .innerJoin(prDetails, eq(purchaseRequests.id, prDetails.prId))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .where(purchaseRequestScope)
      : Promise.resolve(null),
    canApprovePurchaseRequests
      ? db
          .selectDistinct(requestOptionColumns)
          .from(purchaseRequests)
          .innerJoin(companies, eq(purchaseRequests.companyId, companies.id))
          .innerJoin(prDetails, eq(purchaseRequests.id, prDetails.prId))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .where(eq(purchaseRequests.status, "REQUEST"))
      : Promise.resolve(null),
    canBrowsePurchaseOrders
      ? db
          .selectDistinct(requestOptionColumns)
          .from(purchaseOrders)
          .innerJoin(
            purchaseRequests,
            eq(purchaseOrders.prId, purchaseRequests.id)
          )
          .innerJoin(companies, eq(purchaseRequests.companyId, companies.id))
          .innerJoin(poDetails, eq(purchaseOrders.id, poDetails.poId))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .where(purchaseOrderScope)
      : Promise.resolve(null),
    canApproveLeases
      ? db
          .selectDistinct(companyOptionColumns)
          .from(rentAssets)
          .innerJoin(companies, eq(rentAssets.companyId, companies.id))
          .where(eq(rentAssets.status, "NEW"))
      : Promise.resolve(null),
    canApproveLeases
      ? db
          .selectDistinct(assetOptionColumns)
          .from(rentAssets)
          .innerJoin(
            rentAssetDetails,
            eq(rentAssets.id, rentAssetDetails.rentAssetId)
          )
          .innerJoin(assetDatas, eq(rentAssetDetails.assetId, assetDatas.id))
          .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(
            companies,
            eq(branches.companyId, companies.talentaCompanyId)
          )
          .where(eq(rentAssets.status, "NEW"))
      : Promise.resolve(null),
    db
      .selectDistinct(assetOptionColumns)
      .from(assetTransfers)
      .innerJoin(assetDatas, eq(assetTransfers.assetId, assetDatas.id))
      .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
      .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
      .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
      .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
      .innerJoin(branches, eq(outlets.branchId, branches.branchId))
      .innerJoin(companies, eq(branches.companyId, companies.talentaCompanyId))
      .where(and(eq(assetTransfers.status, "PENDING"), transferReceiptScope)),
    canBrowseTransfers
      ? db
          .selectDistinct(assetOptionColumns)
          .from(assetTransfers)
          .innerJoin(assetDatas, eq(assetTransfers.assetId, assetDatas.id))
          .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(
            companies,
            eq(branches.companyId, companies.talentaCompanyId)
          )
          .where(and(isNull(assetTransfers.rentDtlId), recentTransferScope))
      : Promise.resolve(null),
  ])

  const optionRows = optionGroups.flatMap((rows) => rows ?? [])
  const companyOptions = new Map<
    string,
    { id: string; name: string; code: string }
  >()
  const branchOptions = new Map<
    string,
    { id: string; name: string; companyId: string; companyName: string }
  >()
  const outletOptions = new Map<
    string,
    {
      id: string
      name: string
      branchId: string
      branchName: string
      companyName: string
    }
  >()
  const assetCodeOptions = new Map<
    string,
    { id: string; code: string; name: string }
  >()
  const statusOptions = new Set<string>()

  for (const row of optionRows) {
    if (row.companyId && row.companyName && row.companyCode) {
      companyOptions.set(row.companyId, {
        id: row.companyId,
        name: row.companyName,
        code: row.companyCode,
      })
    }
    if (row.branchId && row.branchName && row.companyId && row.companyName) {
      branchOptions.set(row.branchId, {
        id: row.branchId,
        name: row.branchName,
        companyId: row.companyId,
        companyName: row.companyName,
      })
    }
    if (
      row.outletId &&
      row.outletName &&
      row.branchId &&
      row.branchName &&
      row.companyName
    ) {
      outletOptions.set(row.outletId, {
        id: row.outletId,
        name: row.outletName,
        branchId: row.branchId,
        branchName: row.branchName,
        companyName: row.companyName,
      })
    }
    if (row.assetCodeId && row.assetCode && row.assetCodeName) {
      assetCodeOptions.set(row.assetCodeId, {
        id: row.assetCodeId,
        code: row.assetCode,
        name: row.assetCodeName,
      })
    }
    if (row.assetStatus) {
      statusOptions.add(row.assetStatus)
    }
  }

  const currentYear = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date())
  )
  const years = Array.from({ length: 11 }, (_, index) => currentYear - index)
  const rawYear = Number(input.year)
  const rawMonth = Number(input.month)
  const parsedStatus = statusSchema.safeParse(input.assetStatus)
  const companyId = parseOptionId(input.companyId, companyOptions)
  const parsedBranchId = parseOptionId(input.branchId, branchOptions)
  const branchId =
    parsedBranchId &&
    (!companyId || branchOptions.get(parsedBranchId)?.companyId === companyId)
      ? parsedBranchId
      : undefined
  const parsedOutletId = parseOptionId(input.outletId, outletOptions)
  const outletId =
    parsedOutletId &&
    (!branchId || outletOptions.get(parsedOutletId)?.branchId === branchId) &&
    (!companyId ||
      branchOptions.get(outletOptions.get(parsedOutletId)?.branchId ?? "")
        ?.companyId === companyId)
      ? parsedOutletId
      : undefined
  const filters: DashboardFilters = {
    year:
      Number.isInteger(rawYear) && years.includes(rawYear)
        ? rawYear
        : undefined,
    month:
      Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
        ? rawMonth
        : undefined,
    companyId,
    branchId,
    outletId,
    assetCodeId: parseOptionId(input.assetCodeId, assetCodeOptions),
    assetStatus:
      parsedStatus.success && statusOptions.has(parsedStatus.data)
        ? parsedStatus.data
        : undefined,
  }

  const inventoryWhere = and(
    inventoryScope,
    ...periodConditions(assetDatas.createdAt, filters),
    ...assetConditions(filters)
  )
  const purchaseRequestWhere = and(
    purchaseRequestScope,
    ...periodConditions(purchaseRequests.date, filters),
    filters.companyId
      ? eq(purchaseRequests.companyId, filters.companyId)
      : undefined,
    requestAssetCodeCondition(filters.assetCodeId)
  )
  const purchaseOrderWhere = and(
    purchaseOrderScope,
    ...periodConditions(purchaseOrders.date, filters),
    filters.companyId
      ? eq(purchaseRequests.companyId, filters.companyId)
      : undefined,
    orderAssetCodeCondition(filters.assetCodeId)
  )
  const purchaseRequestQueueWhere = and(
    eq(purchaseRequests.status, "REQUEST"),
    ...periodConditions(purchaseRequests.date, filters),
    filters.companyId
      ? eq(purchaseRequests.companyId, filters.companyId)
      : undefined,
    requestAssetCodeCondition(filters.assetCodeId)
  )
  const leaseQueueWhere = and(
    eq(rentAssets.status, "NEW"),
    ...periodConditions(rentAssets.rentDate, filters),
    filters.companyId ? eq(rentAssets.companyId, filters.companyId) : undefined,
    leaseAssetCondition(filters)
  )
  const transferWhere = and(
    ...periodConditions(assetTransfers.transferDate, filters),
    ...assetConditions(filters)
  )

  const [
    inventoryRows,
    locationRows,
    purchaseRequestRows,
    purchaseOrderRows,
    purchaseRequestQueueRows,
    leaseQueueRows,
    transferReceiptRows,
    recentMovements,
  ] = await Promise.all([
    canBrowseInventory
      ? db
          .select({
            total: sql<number>`count(*)::int`,
            available: sql<number>`(count(*) filter (where ${assetDatas.status} = 'TERSEDIA'))::int`,
            booked: sql<number>`(count(*) filter (where ${assetDatas.status} = 'BOOKED'))::int`,
            leased: sql<number>`(count(*) filter (where ${assetDatas.status} = 'DIGUNAKAN'))::int`,
          })
          .from(assetDatas)
          .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(
            companies,
            eq(branches.companyId, companies.talentaCompanyId)
          )
          .where(inventoryWhere)
      : Promise.resolve(null),
    canBrowseInventory
      ? db
          .select({
            companyId: companies.id,
            companyName: companies.name,
            companyCode: companies.code,
            branchId: branches.id,
            branchName: branches.name,
            outletId: outlets.id,
            outletName: outlets.name,
            assetCount: sql<number>`count(*)::int`,
          })
          .from(assetDatas)
          .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(
            companies,
            eq(branches.companyId, companies.talentaCompanyId)
          )
          .where(inventoryWhere)
          .groupBy(
            companies.id,
            companies.name,
            companies.code,
            branches.id,
            branches.name,
            outlets.id,
            outlets.name
          )
          .orderBy(
            asc(companies.name),
            asc(companies.id),
            asc(branches.name),
            asc(branches.id),
            asc(outlets.name),
            asc(outlets.id)
          )
      : Promise.resolve(null),
    canBrowsePurchaseRequests
      ? db
          .select({
            records: sql<number>`count(*)::int`,
            units: filters.assetCodeId
              ? sql<number>`coalesce(sum((
                  select coalesce(sum(${prDetails.quantity}), 0)
                  from ${prDetails}
                  where ${prDetails.prId} = ${purchaseRequests.id}
                    and ${prDetails.assetCodeId} = ${filters.assetCodeId}
                )), 0)`.mapWith(Number)
              : sql<number>`coalesce(sum(${purchaseRequests.totalQuantity}), 0)`.mapWith(
                  Number
                ),
            amount: filters.assetCodeId
              ? sql<number>`coalesce(sum((
                  select coalesce(sum(${prDetails.total}), 0)
                  from ${prDetails}
                  where ${prDetails.prId} = ${purchaseRequests.id}
                    and ${prDetails.assetCodeId} = ${filters.assetCodeId}
                )), 0)`.mapWith(Number)
              : sql<number>`coalesce(sum(${purchaseRequests.totalAmount}), 0)`.mapWith(
                  Number
                ),
          })
          .from(purchaseRequests)
          .where(purchaseRequestWhere)
      : Promise.resolve(null),
    canBrowsePurchaseOrders
      ? db
          .select({
            records: sql<number>`count(*)::int`,
            units: filters.assetCodeId
              ? sql<number>`coalesce(sum((
                  select coalesce(sum(${poDetails.quantity}), 0)
                  from ${poDetails}
                  inner join ${prDetails} on ${poDetails.prDtlId} = ${prDetails.id}
                  where ${poDetails.poId} = ${purchaseOrders.id}
                    and ${prDetails.assetCodeId} = ${filters.assetCodeId}
                )), 0)`.mapWith(Number)
              : sql<number>`coalesce(sum(${purchaseOrders.totalQuantity}), 0)`.mapWith(
                  Number
                ),
            cost: filters.assetCodeId
              ? sql<number>`coalesce(sum((
                  select coalesce(sum(${poDetails.total}), 0)
                  from ${poDetails}
                  inner join ${prDetails} on ${poDetails.prDtlId} = ${prDetails.id}
                  where ${poDetails.poId} = ${purchaseOrders.id}
                    and ${prDetails.assetCodeId} = ${filters.assetCodeId}
                )), 0)`.mapWith(Number)
              : sql<number>`coalesce(sum(${purchaseOrders.totalCost}), 0)`.mapWith(
                  Number
                ),
          })
          .from(purchaseOrders)
          .innerJoin(
            purchaseRequests,
            eq(purchaseOrders.prId, purchaseRequests.id)
          )
          .where(purchaseOrderWhere)
      : Promise.resolve(null),
    canApprovePurchaseRequests
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(purchaseRequests)
          .where(purchaseRequestQueueWhere)
      : Promise.resolve(null),
    canApproveLeases
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(rentAssets)
          .where(leaseQueueWhere)
      : Promise.resolve(null),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetTransfers)
      .innerJoin(assetDatas, eq(assetTransfers.assetId, assetDatas.id))
      .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
      .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
      .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
      .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
      .innerJoin(branches, eq(outlets.branchId, branches.branchId))
      .innerJoin(companies, eq(branches.companyId, companies.talentaCompanyId))
      .where(
        and(
          eq(assetTransfers.status, "PENDING"),
          transferReceiptScope,
          transferWhere
        )
      ),
    canBrowseTransfers
      ? db
          .select({
            id: assetTransfers.id,
            transferDate: assetTransfers.transferDate,
            assetNumber: assetDatas.nomorAssets,
            assetName: assetCodes.name,
            outletName: outlets.name,
            assignedUserName: users.name,
            status: assetTransfers.status,
          })
          .from(assetTransfers)
          .innerJoin(assetDatas, eq(assetTransfers.assetId, assetDatas.id))
          .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
          .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
          .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
          .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(
            companies,
            eq(branches.companyId, companies.talentaCompanyId)
          )
          .innerJoin(users, eq(assetTransfers.userId, users.id))
          .where(
            and(
              isNull(assetTransfers.rentDtlId),
              recentTransferScope,
              transferWhere
            )
          )
          .orderBy(desc(assetTransfers.createdAt), desc(assetTransfers.id))
          .limit(5)
      : Promise.resolve(null),
  ])

  const inventory = inventoryRows?.[0]
  const locations =
    locationRows === null
      ? null
      : locationRows.reduce<DashboardLocation[]>((result, row) => {
          let company = result.at(-1)

          if (!company || company.id !== row.companyId) {
            company = {
              id: row.companyId,
              name: row.companyName,
              code: row.companyCode,
              assetCount: 0,
              branches: [],
            }
            result.push(company)
          }

          let branch = company.branches.at(-1)

          if (!branch || branch.id !== row.branchId) {
            branch = {
              id: row.branchId,
              name: row.branchName,
              assetCount: 0,
              outlets: [],
            }
            company.branches.push(branch)
          }

          branch.outlets.push({
            id: row.outletId,
            name: row.outletName,
            assetCount: row.assetCount,
          })
          branch.assetCount += row.assetCount
          company.assetCount += row.assetCount

          return result
        }, [])

  const sortedCompanies = [...companyOptions.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const sortedBranches = [...branchOptions.values()].sort(
    (a, b) =>
      a.companyName.localeCompare(b.companyName) || a.name.localeCompare(b.name)
  )
  const sortedOutlets = [...outletOptions.values()].sort(
    (a, b) =>
      a.companyName.localeCompare(b.companyName) ||
      a.branchName.localeCompare(b.branchName) ||
      a.name.localeCompare(b.name)
  )
  const sortedAssetCodes = [...assetCodeOptions.values()].sort(
    (a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name)
  )
  const sortedStatuses = [...statusOptions]
    .sort((a, b) => {
      const knownOrder = ["TERSEDIA", "BOOKED", "DIGUNAKAN"]
      const aIndex = knownOrder.indexOf(a)
      const bIndex = knownOrder.indexOf(b)

      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? knownOrder.length : aIndex) -
          (bIndex === -1 ? knownOrder.length : bIndex)
        )
      }

      return a.localeCompare(b)
    })
    .map((value) => ({ value, label: statusLabels[value] ?? value }))

  return {
    scopeLabel: superAdmin
      ? "All records allowed by your permissions"
      : "Records visible to your account",
    filters,
    filterOptions: {
      years,
      companies: sortedCompanies,
      branches: sortedBranches,
      outlets: sortedOutlets,
      assetCodes: sortedAssetCodes,
      statuses: sortedStatuses,
    },
    inventory: inventory
      ? {
          ...inventory,
          other:
            inventory.total -
            inventory.available -
            inventory.booked -
            inventory.leased,
        }
      : null,
    locations,
    purchaseRequests: purchaseRequestRows?.[0] ?? null,
    purchaseOrders: purchaseOrderRows?.[0] ?? null,
    workflow: {
      pendingReceipts: transferReceiptRows[0]?.count ?? 0,
      purchaseRequests: purchaseRequestQueueRows?.[0]?.count ?? null,
      assetLeases: leaseQueueRows?.[0]?.count ?? null,
    },
    canReadTransfers,
    recentMovements,
  }
}
