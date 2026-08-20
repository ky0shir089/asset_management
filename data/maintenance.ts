import "server-only"

import { db } from "@/drizzle/db"
import {
  assetCategories,
  assetCodes,
  assetDatas,
  maintenances,
  outlets,
  poDetails,
  prDetails,
  users,
} from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { requireUser } from "./require-user"
import { eq, desc } from "drizzle-orm"
import { notFound } from "next/navigation"

export async function getAssetMaintenanceDetail(assetId: string) {
  const user = await requireUser()
  await requirePermission("received-asset:read")

  const asset = await db
    .select({
      id: assetDatas.id,
      assetNumber: assetDatas.nomorAssets,
      status: assetDatas.status,
      condition: assetDatas.condition,
      categoryName: assetCategories.name,
      assetCodeName: assetCodes.name,
      outletName: outlets.name,
      purchasePrice: poDetails.price,
      createdBy: assetDatas.createdBy,
    })
    .from(assetDatas)
    .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
    .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
    .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
    .innerJoin(assetCategories, eq(assetCodes.categoryId, assetCategories.id))
    .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
    .where(eq(assetDatas.id, assetId))
    .then((res) => res[0])

  if (!asset) {
    notFound()
  }

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin && asset.createdBy !== user.id) {
    notFound()
  }

  const maintenanceHistory = await db
    .select({
      id: maintenances.id,
      detail: maintenances.detail,
      amount: maintenances.amount,
      createdAt: maintenances.createdAt,
      creatorName: users.name,
    })
    .from(maintenances)
    .leftJoin(users, eq(maintenances.createdBy, users.id))
    .where(eq(maintenances.assetId, asset.id))
    .orderBy(desc(maintenances.createdAt))

  return {
    asset,
    maintenanceHistory,
  }
}
