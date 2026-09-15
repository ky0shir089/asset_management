import "server-only"

import { db } from "@/drizzle/db"
import {
  assetCategories,
  assetCodes,
  assetDatas,
  assetTransfers,
  companies,
  maintenances,
  outlets,
  poDetails,
  prDetails,
  rentAssetDetails,
  rentAssets,
  users,
} from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { requireUser } from "./require-user"
import { and, desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { notFound } from "next/navigation"
import { z } from "zod"

export async function getAssetMaintenanceDetail(assetId: string) {
  if (!z.string().uuid().safeParse(assetId).success) {
    notFound()
  }

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
      outletId: assetDatas.outletId,
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

  const [superAdmin, currentHolder] = await Promise.all([
    isSuperAdmin(user.id),
    db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(assetTransfers)
      .innerJoin(users, eq(assetTransfers.userId, users.id))
      .where(
        and(
          eq(assetTransfers.assetId, asset.id),
          eq(assetTransfers.status, "RECEIVED")
        )
      )
      .orderBy(desc(assetTransfers.createdAt), desc(assetTransfers.id))
      .then((res) => res[0] ?? null),
  ])
  const isFullAccess =
    superAdmin || user.role === "Admin GA" || user.role === "Admin IT"

  if (!isFullAccess) {
    if (user.role === "Branch Manager" && user.branchId) {
      const outlet = await db
        .select({ branchId: outlets.branchId })
        .from(outlets)
        .where(eq(outlets.id, asset.outletId))
        .then((res) => res[0])

      if (!outlet || outlet.branchId !== user.branchId) {
        notFound()
      }
    } else if (asset.createdBy !== user.id && currentHolder?.id !== user.id) {
      notFound()
    }
  }

  if (!isFullAccess) {
    asset.purchasePrice = null
    asset.status = "-"
  }

  const confirmingUsers = alias(users, "confirming_users")
  const [leases, transferHistory, maintenanceHistory] = await Promise.all([
    db
      .select({
        id: rentAssetDetails.id,
        rentNo: rentAssets.rentNo,
        rentDate: rentAssets.rentDate,
        receiveDate: rentAssets.receiveDate,
        dateStart: rentAssetDetails.dateStart,
        dateEnd: rentAssetDetails.dateEnd,
        amount: rentAssetDetails.amount,
        status: rentAssets.status,
        companyCode: companies.code,
        companyName: companies.name,
      })
      .from(rentAssetDetails)
      .innerJoin(rentAssets, eq(rentAssetDetails.rentAssetId, rentAssets.id))
      .innerJoin(companies, eq(rentAssets.companyId, companies.id))
      .where(eq(rentAssetDetails.assetId, asset.id))
      .orderBy(
        desc(rentAssets.rentDate),
        desc(rentAssetDetails.createdAt),
        desc(rentAssetDetails.id)
      ),
    db
      .select({
        id: assetTransfers.id,
        transferDate: assetTransfers.transferDate,
        status: assetTransfers.status,
        condition: assetTransfers.condition,
        receivedAt: assetTransfers.receivedAt,
        outletName: outlets.name,
        assignedUserName: users.name,
        assignedUserImage: users.image,
        confirmedByName: confirmingUsers.name,
        confirmedByImage: confirmingUsers.image,
        rentNo: rentAssets.rentNo,
        companyCode: companies.code,
        companyName: companies.name,
      })
      .from(assetTransfers)
      .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
      .innerJoin(users, eq(assetTransfers.userId, users.id))
      .leftJoin(
        confirmingUsers,
        eq(assetTransfers.receivedBy, confirmingUsers.id)
      )
      .leftJoin(
        rentAssetDetails,
        eq(assetTransfers.rentDtlId, rentAssetDetails.id)
      )
      .leftJoin(rentAssets, eq(rentAssetDetails.rentAssetId, rentAssets.id))
      .leftJoin(companies, eq(rentAssets.companyId, companies.id))
      .where(eq(assetTransfers.assetId, asset.id))
      .orderBy(
        desc(assetTransfers.transferDate),
        desc(assetTransfers.createdAt),
        desc(assetTransfers.id)
      ),
    db
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
      .orderBy(desc(maintenances.createdAt), desc(maintenances.id)),
  ])

  return {
    asset,
    currentHolder,
    leases: leases.map((lease) => ({
      ...lease,
      amount: isFullAccess ? lease.amount : null,
    })),
    transferHistory,
    maintenanceHistory,
  }
}

export type AssetMaintenanceDetail = Awaited<
  ReturnType<typeof getAssetMaintenanceDetail>
>
