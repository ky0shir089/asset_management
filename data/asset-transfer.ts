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
  users,
} from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  type SQL,
} from "drizzle-orm"
import { requireUser } from "./require-user"
import { notFound } from "next/navigation"

export async function assetTransferIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("asset-transfer:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const superAdmin = await isSuperAdmin(user.id)
  const conditions: SQL[] = [isNull(assetTransfers.rentDtlId)]

  if (!superAdmin) {
    conditions.push(eq(assetTransfers.createdBy, user.id))
  }
  if (search) {
    const pattern = `%${search}%`
    const matches = or(
      ilike(assetDatas.nomorAssets, pattern),
      ilike(assetCodes.code, pattern),
      ilike(assetCodes.name, pattern),
      ilike(companies.code, pattern),
      ilike(companies.name, pattern),
      ilike(outlets.name, pattern),
      ilike(users.name, pattern)
    )
    if (matches) conditions.push(matches)
  }

  const where = and(...conditions)
  const [data, [{ count: total }]] = await Promise.all([
    db
      .select({
        id: assetTransfers.id,
        transferDate: assetTransfers.transferDate,
        assetNumber: assetDatas.nomorAssets,
        assetCode: assetCodes.code,
        assetName: assetCodes.name,
        companyCode: companies.code,
        companyName: companies.name,
        outletName: outlets.name,
        userName: users.name,
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
      .where(where)
      .orderBy(desc(assetTransfers.createdAt))
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    db
      .select({ count: count() })
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
      .where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export type assetTransferIndexType = Awaited<
  ReturnType<typeof assetTransferIndex>
>["data"][number]

export async function assetTransferShow(id: string) {
  const user = await requireUser()
  await requirePermission("asset-transfer:read")

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    notFound()
  }

  const superAdmin = await isSuperAdmin(user.id)

  // Scope: transfer creator or assigned user
  const scope = or(
    eq(assetTransfers.createdBy, user.id),
    eq(assetTransfers.userId, user.id)
  )

  const conditions = [
    eq(assetTransfers.id, id),
    isNull(assetTransfers.rentDtlId),
    superAdmin ? undefined : scope,
  ].filter(Boolean)

  const [data] = await db
    .select({
      id: assetTransfers.id,
      transferDate: assetTransfers.transferDate,
      assetNumber: assetDatas.nomorAssets,
      assetCode: assetCodes.code,
      assetName: assetCodes.name,
      companyCode: companies.code,
      companyName: companies.name,
      outletName: outlets.name,
      userName: users.name,
      status: assetTransfers.status,
      createdAt: assetTransfers.createdAt,
    })
    .from(assetTransfers)
    .innerJoin(assetDatas, eq(assetTransfers.assetId, assetDatas.id))
    .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
    .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
    .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
    .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
    .innerJoin(branches, eq(outlets.branchId, branches.branchId))
    .innerJoin(companies, eq(branches.companyId, companies.talentaCompanyId))
    .innerJoin(users, eq(assetTransfers.userId, users.id))
    .where(and(...conditions))
    .limit(1)

  if (!data) notFound()
  return data
}
