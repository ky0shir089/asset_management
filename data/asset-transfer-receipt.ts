import "server-only"

import { db } from "@/drizzle/db"
import {
  assetCodes,
  assetDatas,
  assetTransfers,
  outlets,
  poDetails,
  prDetails,
  rentAssetDetails,
  rentAssets,
  users,
} from "@/drizzle/schema"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { and, asc, eq } from "drizzle-orm"
import { requireUser } from "./require-user"

export async function assetTransferReceiptQueue() {
  const user = await requireUser()
  const superAdmin = await isSuperAdmin(user.id)

  return db
    .select({
      id: assetTransfers.id,
      transferDate: assetTransfers.transferDate,
      rentNo: rentAssets.rentNo,
      assetNumber: assetDatas.nomorAssets,
      assetName: assetCodes.name,
      outletName: outlets.name,
      assignedUserName: users.name,
    })
    .from(assetTransfers)
    .leftJoin(
      rentAssetDetails,
      eq(assetTransfers.rentDtlId, rentAssetDetails.id)
    )
    .leftJoin(rentAssets, eq(rentAssetDetails.rentAssetId, rentAssets.id))
    .innerJoin(assetDatas, eq(assetTransfers.assetId, assetDatas.id))
    .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
    .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
    .innerJoin(assetCodes, eq(prDetails.assetCodeId, assetCodes.id))
    .innerJoin(outlets, eq(assetTransfers.outletId, outlets.id))
    .innerJoin(users, eq(assetTransfers.userId, users.id))
    .where(
      and(
        eq(assetTransfers.status, "PENDING"),
        superAdmin ? undefined : eq(assetTransfers.userId, user.id)
      )
    )
    .orderBy(asc(assetTransfers.transferDate), asc(assetTransfers.createdAt))
}

export type assetTransferReceiptQueueType = Awaited<
  ReturnType<typeof assetTransferReceiptQueue>
>[number]
