"use server"

import { requireUser } from "@/data/require-user"
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
import { authorizeAction } from "@/lib/auth/permission"
import {
  standaloneAssetTransferSchema,
  type standaloneAssetTransferSchemaType,
} from "@/lib/formSchemas/asset-transfer-schema"
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

class AssetTransferWorkflowError extends Error {}

export async function getStandaloneTransferOptions(companyId: string) {
  await requireUser()
  const permission = await authorizeAction("asset-transfer:create")
  if (!permission.authorized) return permission.response

  if (!z.uuid().safeParse(companyId).success) {
    return { success: false as const, message: "Invalid company" }
  }

  try {
    const company = await db.query.companies.findFirst({
      columns: { id: true },
      where: and(
        eq(companies.id, companyId),
        eq(companies.isActive, true),
        ne(companies.code, "LSA")
      ),
    })
    if (!company) {
      return { success: false as const, message: "Company not found" }
    }

    const [assetRows, eligibleUsers, categories] = await Promise.all([
      db
        .select({
          id: assetDatas.id,
          nomorAssets: assetDatas.nomorAssets,
          condition: assetDatas.condition,
          outletId: assetDatas.outletId,
          outletName: outlets.name,
          categoryId: assetCodes.categoryId,
          assetCodeId: assetCodes.id,
          assetCode: assetCodes.code,
          assetName: assetCodes.name,
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
        .where(
          and(
            eq(companies.id, companyId),
            eq(assetDatas.status, "TERSEDIA"),
            eq(branches.isActive, true),
            eq(outlets.isActive, true)
          )
        )
        .orderBy(asc(assetDatas.nomorAssets)),
      db
        .select({
          id: users.id,
          name: users.name,
          outletId: outlets.id,
          outletName: outlets.name,
        })
        .from(users)
        .innerJoin(branches, eq(users.companyId, branches.branchId))
        .innerJoin(
          outlets,
          and(
            eq(users.branchId, outlets.outletId),
            eq(outlets.branchId, branches.branchId)
          )
        )
        .innerJoin(
          companies,
          eq(branches.companyId, companies.talentaCompanyId)
        )
        .where(
          and(
            eq(companies.id, companyId),
            eq(branches.isActive, true),
            eq(outlets.isActive, true)
          )
        )
        .orderBy(asc(users.name)),
      db.query.assetCategories.findMany({
        columns: {
          id: true,
          name: true,
        },
        orderBy: (assetCategories, { asc }) => [asc(assetCategories.createdAt)],
      }),
    ])

    const assetIds = assetRows.map((asset) => asset.id)
    const latestTransfers = assetIds.length
      ? await db
          .selectDistinctOn([assetTransfers.assetId], {
            id: assetTransfers.id,
            assetId: assetTransfers.assetId,
            status: assetTransfers.status,
          })
          .from(assetTransfers)
          .where(inArray(assetTransfers.assetId, assetIds))
          .orderBy(
            assetTransfers.assetId,
            desc(assetTransfers.createdAt),
            desc(assetTransfers.id)
          )
      : []
    const latestTransferByAsset = new Map(
      latestTransfers.map((transfer) => [transfer.assetId, transfer])
    )

    return {
      success: true as const,
      data: {
        assets: assetRows.flatMap((asset) => {
          const latestTransfer = latestTransferByAsset.get(asset.id)
          return latestTransfer?.status === "PENDING"
            ? []
            : [
                {
                  ...asset,
                  expectedTransferId: latestTransfer?.id ?? null,
                },
              ]
        }),
        users: eligibleUsers,
        categories,
      },
    }
  } catch (error) {
    console.error("Failed to load standalone transfer options", error)
    return { success: false as const, message: "Failed to load transfer options" }
  }
}

export async function standaloneAssetTransferStore(
  values: standaloneAssetTransferSchemaType
) {
  const actor = await requireUser()
  const permission = await authorizeAction("asset-transfer:create")
  if (!permission.authorized) return permission.response

  const validation = standaloneAssetTransferSchema.safeParse(values)
  if (!validation.success) {
    return {
      success: false as const,
      message: validation.error.issues[0]?.message ?? "Invalid transfer data",
    }
  }

  const data = validation.data

  try {
    await db.transaction(async (tx) => {
      const company = await tx.query.companies.findFirst({
        columns: { id: true },
        where: and(
          eq(companies.id, data.companyId),
          eq(companies.isActive, true),
          ne(companies.code, "LSA")
        ),
      })
      if (!company) {
        throw new AssetTransferWorkflowError("Company not found")
      }

      const [asset] = await tx
        .select({
          id: assetDatas.id,
          outletId: assetDatas.outletId,
          status: assetDatas.status,
        })
        .from(assetDatas)
        .where(eq(assetDatas.id, data.assetId))
        .for("update")

      if (!asset || asset.status !== "TERSEDIA") {
        throw new AssetTransferWorkflowError(
          "Only available assets can be transferred"
        )
      }
      if (asset.outletId !== data.expectedOutletId) {
        throw new AssetTransferWorkflowError(
          "Asset location changed. Refresh and try again."
        )
      }

      const [source] = await tx
        .select({ companyId: companies.id })
        .from(outlets)
        .innerJoin(branches, eq(outlets.branchId, branches.branchId))
        .innerJoin(
          companies,
          eq(branches.companyId, companies.talentaCompanyId)
        )
        .where(
          and(
            eq(outlets.id, asset.outletId),
            eq(outlets.isActive, true),
            eq(branches.isActive, true)
          )
        )
        .limit(1)
      if (!source || source.companyId !== data.companyId) {
        throw new AssetTransferWorkflowError(
          "Selected asset does not belong to the selected company"
        )
      }

      const [latestTransfer] = await tx
        .select({
          id: assetTransfers.id,
          transferDate: assetTransfers.transferDate,
          outletId: assetTransfers.outletId,
          userId: assetTransfers.userId,
          status: assetTransfers.status,
        })
        .from(assetTransfers)
        .where(eq(assetTransfers.assetId, asset.id))
        .orderBy(desc(assetTransfers.createdAt), desc(assetTransfers.id))
        .limit(1)

      if ((latestTransfer?.id ?? null) !== data.expectedTransferId) {
        throw new AssetTransferWorkflowError(
          "Asset was transferred by another user. Refresh and try again."
        )
      }
      if (latestTransfer?.status === "PENDING") {
        throw new AssetTransferWorkflowError(
          "Latest transfer must be received before another transfer"
        )
      }
      if (
        latestTransfer?.transferDate &&
        data.transferDate < latestTransfer.transferDate
      ) {
        throw new AssetTransferWorkflowError(
          "Transfer date cannot be before latest transfer date"
        )
      }

      const [destination] = await tx
        .select({
          userId: users.id,
          outletId: outlets.id,
        })
        .from(users)
        .innerJoin(branches, eq(users.companyId, branches.branchId))
        .innerJoin(
          outlets,
          and(
            eq(users.branchId, outlets.outletId),
            eq(outlets.branchId, branches.branchId)
          )
        )
        .innerJoin(
          companies,
          eq(branches.companyId, companies.talentaCompanyId)
        )
        .where(
          and(
            eq(users.id, data.userId),
            eq(companies.id, data.companyId),
            eq(branches.isActive, true),
            eq(outlets.isActive, true)
          )
        )
        .limit(1)
      if (!destination) {
        throw new AssetTransferWorkflowError(
          "Selected user does not belong to the selected company"
        )
      }
      if (
        latestTransfer?.userId === destination.userId &&
        latestTransfer.outletId === destination.outletId
      ) {
        throw new AssetTransferWorkflowError(
          "Asset is already assigned to the selected user"
        )
      }

      await tx.insert(assetTransfers).values({
        rentDtlId: null,
        transferDate: data.transferDate,
        assetId: asset.id,
        outletId: destination.outletId,
        userId: destination.userId,
        status: "PENDING",
        createdBy: actor.id,
      })

      const [moved] = await tx
        .update(assetDatas)
        .set({ outletId: destination.outletId, updatedBy: actor.id })
        .where(
          and(
            eq(assetDatas.id, asset.id),
            eq(assetDatas.outletId, data.expectedOutletId),
            eq(assetDatas.status, "TERSEDIA")
          )
        )
        .returning({ id: assetDatas.id })
      if (!moved) {
        throw new AssetTransferWorkflowError(
          "Asset location changed. Refresh and try again."
        )
      }
    })

    revalidatePath("/distribution/asset-transfer")
    revalidatePath("/distribution/asset-transfer-receipts")
    revalidatePath("/asset-transaction/received-asset")
    revalidatePath(`/asset-transaction/received-asset/${data.assetId}`)

    return { success: true as const, message: "Asset transferred successfully" }
  } catch (error) {
    if (error instanceof AssetTransferWorkflowError) {
      return { success: false as const, message: error.message }
    }
    console.error("Failed to create standalone asset transfer", error)
    return { success: false as const, message: "Failed to transfer asset" }
  }
}
