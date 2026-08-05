"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  assetCodes,
  assetDatas,
  assetSpecs,
  assetTransfers,
  branches,
  companies,
  outlets,
  poDetails,
  prDetails,
  prSpecifications,
  rentAssetDetails,
  rentAssets,
  rentPhotoAssets,
  users,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import {
  assetLeaseApproveSchema,
  assetLeaseRejectSchema,
  assetLeaseSchema,
} from "@/lib/formSchemas/asset-lease-schema"
import {
  assetTransferReceiptSchema,
  assetTransferSchema,
  type assetTransferSchemaType,
} from "@/lib/formSchemas/asset-transfer-schema"
import {
  cleanupRentFiles,
  cleanupRentPhotos,
  saveRentPhotos,
  type SavedPhoto,
} from "@/lib/local-upload"
import { and, asc, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import z from "zod"

async function generateRentNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  createdAt = new Date()
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(createdAt)
      .filter((part) => part.type === "year" || part.type === "month")
      .map((part) => [part.type, part.value])
  )
  const prefix = `SWA/${parts.year}/${parts.month}/`

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)

  const [last] = await tx
    .select({ rentNo: rentAssets.rentNo })
    .from(rentAssets)
    .where(ilike(rentAssets.rentNo, `${prefix}%`))
    .orderBy(desc(rentAssets.rentNo))
    .limit(1)

  const lastSequence = Number(last?.rentNo.split("/").pop() ?? 0)

  if (lastSequence >= 99_999) {
    throw new Error("Monthly asset lease number capacity reached")
  }

  const sequence = String(lastSequence + 1).padStart(5, "0")

  return `${prefix}${sequence}`
}

function collectPhotoGroups(formData: FormData, detailCount: number): File[][] {
  return Array.from({ length: detailCount }, (_, index) =>
    formData
      .getAll(`photos-${index}`)
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  )
}

type PreparedRentDetail = {
  id: string
  photos: SavedPhoto[]
}

function collectDetailPhotos(formData: FormData, detailId: string) {
  return formData
    .getAll(`photos-${detailId}`)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
}

async function prepareDetailPhotos(
  details: Array<{ id: string; photos: File[] }>
) {
  const prepared: PreparedRentDetail[] = []
  try {
    for (const detail of details) {
      prepared.push({
        id: detail.id,
        photos: await saveRentPhotos(detail.id, detail.photos),
      })
    }
    return prepared
  } catch (error) {
    await cleanupRentPhotos(prepared.flatMap((detail) => detail.photos))
    throw error
  }
}

class AssetLeaseWorkflowError extends Error {}

export async function getAssetCodes(categoryId: string) {
  await requireUser()
  const permission = await authorizeAction("asset-lease:create")
  if (!permission.authorized) return permission.response

  if (!z.uuid().safeParse(categoryId).success) {
    return { success: false as const, message: "Invalid asset category" }
  }

  try {
    const data = await db
      .selectDistinct({
        id: assetCodes.id,
        code: assetCodes.code,
        name: assetCodes.name,
      })
      .from(assetCodes)
      .innerJoin(prDetails, eq(prDetails.assetCodeId, assetCodes.id))
      .innerJoin(poDetails, eq(poDetails.prDtlId, prDetails.id))
      .innerJoin(assetDatas, eq(assetDatas.poDetailId, poDetails.id))
      .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
      .innerJoin(branches, eq(outlets.branchId, branches.branchId))
      .innerJoin(companies, eq(branches.companyId, companies.talentaCompanyId))
      .where(
        and(
          eq(assetCodes.categoryId, categoryId),
          eq(assetDatas.status, "TERSEDIA"),
          eq(companies.code, "LSA")
        )
      )
      .orderBy(asc(assetCodes.code))

    return { success: true as const, data }
  } catch (error) {
    console.error("Failed to load asset codes", error)
    return { success: false as const, message: "Failed to load asset codes" }
  }
}

export async function getAssets(codeId: string) {
  await requireUser()
  const permission = await authorizeAction("asset-lease:create")
  if (!permission.authorized) return permission.response

  if (!z.uuid().safeParse(codeId).success) {
    return { success: false as const, message: "Invalid asset code" }
  }

  try {
    const rows = await db
      .select({
        id: assetDatas.id,
        nomorAssets: assetDatas.nomorAssets,
        condition: assetDatas.condition,
        specificationName: assetSpecs.name,
        specificationValue: prSpecifications.specValue,
      })
      .from(assetDatas)
      .innerJoin(poDetails, eq(assetDatas.poDetailId, poDetails.id))
      .innerJoin(prDetails, eq(poDetails.prDtlId, prDetails.id))
      .innerJoin(outlets, eq(assetDatas.outletId, outlets.id))
      .innerJoin(branches, eq(outlets.branchId, branches.branchId))
      .innerJoin(companies, eq(branches.companyId, companies.talentaCompanyId))
      .leftJoin(prSpecifications, eq(prSpecifications.prDtlId, prDetails.id))
      .leftJoin(assetSpecs, eq(prSpecifications.specId, assetSpecs.id))
      .where(
        and(
          eq(prDetails.assetCodeId, codeId),
          eq(assetDatas.status, "TERSEDIA"),
          eq(companies.code, "LSA")
        )
      )
      .orderBy(asc(assetDatas.nomorAssets))

    const assets = new Map<
      string,
      {
        id: string
        nomorAssets: string
        condition: string
        specifications: Array<{ name: string; value: string | null }>
      }
    >()

    for (const row of rows) {
      const asset = assets.get(row.id) ?? {
        id: row.id,
        nomorAssets: row.nomorAssets,
        condition: row.condition ?? "",
        specifications: [],
      }
      if (row.specificationName !== null) {
        asset.specifications.push({
          name: row.specificationName,
          value: row.specificationValue,
        })
      }
      assets.set(row.id, asset)
    }

    return { success: true as const, data: Array.from(assets.values()) }
  } catch (error) {
    console.error("Failed to load assets", error)
    return { success: false as const, message: "Failed to load assets" }
  }
}

export async function assetLeaseStore(formData: FormData) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-lease:create")

    if (!permission.authorized) {
      return permission.response
    }

    let details: unknown
    try {
      details = JSON.parse((formData.get("details") as string) || "[]")
    } catch {
      return { success: false, message: "Invalid form data" }
    }

    if (!Array.isArray(details) || details.length < 1) {
      return { success: false, message: "Add at least one asset" }
    }

    const photoGroups = collectPhotoGroups(formData, details.length)
    const validation = assetLeaseSchema.safeParse({
      companyId: formData.get("companyId"),
      dateStart: formData.get("dateStart"),
      note: formData.get("note") || undefined,
      details: details.map((detail, index) => ({
        ...(typeof detail === "object" && detail !== null ? detail : {}),
        photos: photoGroups[index],
      })),
    })

    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message ?? "Invalid form data",
      }
    }

    const data = validation.data
    const preparedDetails: PreparedRentDetail[] = []

    try {
      for (const files of photoGroups) {
        const id = crypto.randomUUID()
        preparedDetails.push({ id, photos: [] })
        preparedDetails.at(-1)!.photos = await saveRentPhotos(id, files)
      }

      await db.transaction(async (tx) => {
        const [company] = await tx
          .select({ id: companies.id })
          .from(companies)
          .where(
            and(
              eq(companies.id, data.companyId),
              eq(companies.isActive, true),
              ne(companies.code, "LSA")
            )
          )
          .limit(1)

        if (!company) {
          throw new Error("Company not found or unavailable")
        }

        const assetIds = [
          ...new Set(data.details.map((detail) => detail.assetId)),
        ]
        const lsaOutletIds = tx
          .select({ id: outlets.id })
          .from(outlets)
          .innerJoin(branches, eq(outlets.branchId, branches.branchId))
          .innerJoin(companies, eq(branches.companyId, companies.talentaCompanyId))
          .where(eq(companies.code, "LSA"))

        const eligibleAssets = await tx
          .select({ id: assetDatas.id })
          .from(assetDatas)
          .where(
            and(
              inArray(assetDatas.id, assetIds),
              eq(assetDatas.status, "TERSEDIA"),
              inArray(assetDatas.outletId, lsaOutletIds)
            )
          )

        if (eligibleAssets.length !== assetIds.length) {
          throw new Error("One or more selected assets are no longer available")
        }

        const [rentAsset] = await tx
          .insert(rentAssets)
          .values({
            rentNo: await generateRentNumber(tx),
            rentDate: data.dateStart,
            companyId: data.companyId,
            note: data.note?.trim() || null,
            status: "NEW",
            createdBy: user.id,
          })
          .returning({ id: rentAssets.id })

        await tx.insert(rentAssetDetails).values(
          data.details.map((detail, index) => ({
            id: preparedDetails[index]!.id,
            rentAssetId: rentAsset.id,
            assetId: detail.assetId,
            dateStart: data.dateStart,
            amount: detail.amount,
            createdBy: user.id,
          }))
        )

        await tx.insert(rentPhotoAssets).values(
          preparedDetails.flatMap((detail) =>
            detail.photos.map((photo) => ({
              rentDtlId: detail.id,
              name: photo.name,
              path: photo.path,
              type: "BEFORE" as const,
              createdBy: user.id,
            }))
          )
        )

        const booked = await tx
          .update(assetDatas)
          .set({ status: "BOOKED", updatedBy: user.id })
          .where(
            and(
              inArray(assetDatas.id, assetIds),
              eq(assetDatas.status, "TERSEDIA"),
              inArray(assetDatas.outletId, lsaOutletIds)
            )
          )
          .returning({ id: assetDatas.id })

        if (booked.length !== assetIds.length) {
          throw new Error("One or more selected assets are no longer available")
        }
      })
    } catch (err) {
      await Promise.all(
        preparedDetails.map((detail) =>
          cleanupRentFiles(detail.id).catch(() => {})
        )
      )
      return {
        success: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      }
    }

    revalidatePath("/distribution/asset-lease")

    return { success: true, message: "Asset lease created successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function assetLeaseApprove(formData: FormData) {
  const user = await requireUser()
  const permission = await authorizeAction("asset-lease:update")
  if (!permission.authorized) return permission.response

  const id = String(formData.get("id") ?? "")
  const receiveDate = String(formData.get("receiveDate") ?? "")
  if (!z.uuid().safeParse(id).success) {
    return { success: false, message: "Asset lease not found" }
  }

  let prepared: PreparedRentDetail[] = []
  try {
    const existing = await db.query.rentAssets.findFirst({
      where: eq(rentAssets.id, id),
      columns: { id: true, rentDate: true, status: true },
    })
    if (!existing) throw new AssetLeaseWorkflowError("Asset lease not found")
    if (existing.status !== "NEW") {
      throw new AssetLeaseWorkflowError("Only NEW asset leases can be approved")
    }

    const leasedAssets = await db
      .select({
        detailId: rentAssetDetails.id,
        id: assetDatas.id,
        number: assetDatas.nomorAssets,
      })
      .from(rentAssetDetails)
      .innerJoin(assetDatas, eq(rentAssetDetails.assetId, assetDatas.id))
      .where(eq(rentAssetDetails.rentAssetId, id))
    const validation = assetLeaseApproveSchema.safeParse({
      id,
      rentDate: existing.rentDate,
      receiveDate,
      details: leasedAssets.map((detail) => ({
        rentDetailId: detail.detailId,
        photos: collectDetailPhotos(formData, detail.detailId),
      })),
    })
    if (!validation.success) {
      throw new AssetLeaseWorkflowError(
        validation.error.issues[0]?.message ?? "Invalid approval"
      )
    }

    prepared = await prepareDetailPhotos(
      validation.data.details.map((detail) => ({
        id: detail.rentDetailId,
        photos: detail.photos,
      }))
    )
    const assetIds = [...new Set(leasedAssets.map((asset) => asset.id))]

    await db.transaction(async (tx) => {
      const [decided] = await tx
        .update(rentAssets)
        .set({
          status: "APPROVED",
          receiveDate: validation.data.receiveDate,
          reason: null,
          updatedBy: user.id,
        })
        .where(and(eq(rentAssets.id, id), eq(rentAssets.status, "NEW")))
        .returning({ id: rentAssets.id })
      if (!decided) {
        throw new AssetLeaseWorkflowError("Asset lease was already decided")
      }

      await tx
        .update(rentAssetDetails)
        .set({
          dateStart: validation.data.receiveDate,
          updatedBy: user.id,
        })
        .where(eq(rentAssetDetails.rentAssetId, id))

      const claimed = await tx
        .update(assetDatas)
        .set({ status: "DISEWA", updatedBy: user.id })
        .where(
          and(
            inArray(assetDatas.id, assetIds),
            eq(assetDatas.status, "BOOKED")
          )
        )
        .returning({ id: assetDatas.id })
      if (claimed.length !== assetIds.length) {
        const claimedIds = new Set(claimed.map((asset) => asset.id))
        const unavailable = leasedAssets
          .filter((asset) => !claimedIds.has(asset.id))
          .map((asset) => asset.number)
          .join(", ")
        throw new AssetLeaseWorkflowError(
          `Assets no longer available: ${unavailable}`
        )
      }

      await tx.insert(rentPhotoAssets).values(
        prepared.flatMap((detail) =>
          detail.photos.map((photo) => ({
            rentDtlId: detail.id,
            name: photo.name,
            path: photo.path,
            type: "APPROVE" as const,
            createdBy: user.id,
          }))
        )
      )
    })

    revalidatePath("/distribution/asset-lease")
    revalidatePath(`/distribution/asset-lease/${id}`)
    return { success: true, message: "Asset lease approved successfully" }
  } catch (error) {
    await cleanupRentPhotos(prepared.flatMap((detail) => detail.photos)).catch(
      () => {}
    )
    if (error instanceof AssetLeaseWorkflowError) {
      return { success: false, message: error.message }
    }
    console.error("Failed to approve asset lease", error)
    return { success: false, message: "Failed to approve asset lease" }
  }
}

export async function assetTransferStore(values: assetTransferSchemaType) {
  const user = await requireUser()
  const permission = await authorizeAction("asset-lease:update")
  if (!permission.authorized) return permission.response

  const validation = assetTransferSchema.safeParse(values)
  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues[0]?.message ?? "Invalid transfer data",
    }
  }

  const data = validation.data

  try {
    const superAdmin = await isSuperAdmin(user.id)

    const transferredAssetId = await db.transaction(async (tx) => {
      const [detail] = await tx
        .select({
          id: rentAssetDetails.id,
          assetId: rentAssetDetails.assetId,
          rentAssetId: rentAssetDetails.rentAssetId,
          companyId: rentAssets.companyId,
          createdBy: rentAssets.createdBy,
          status: rentAssets.status,
          receiveDate: rentAssets.receiveDate,
        })
        .from(rentAssetDetails)
        .innerJoin(rentAssets, eq(rentAssetDetails.rentAssetId, rentAssets.id))
        .where(eq(rentAssetDetails.id, data.rentDetailId))
        .limit(1)

      if (!detail || detail.rentAssetId !== data.rentId) {
        throw new AssetLeaseWorkflowError("Leased asset not found")
      }
      if (detail.status !== "APPROVED") {
        throw new AssetLeaseWorkflowError(
          "Only approved leased assets can be transferred"
        )
      }
      if (!superAdmin && detail.createdBy !== user.id) {
        throw new AssetLeaseWorkflowError("Asset lease not found")
      }

      const [asset] = await tx
        .select({
          id: assetDatas.id,
          outletId: assetDatas.outletId,
          status: assetDatas.status,
        })
        .from(assetDatas)
        .where(eq(assetDatas.id, detail.assetId))
        .for("update")

      if (!asset || asset.status !== "DISEWA") {
        throw new AssetLeaseWorkflowError(
          "Only approved leased assets can be transferred"
        )
      }
      if (asset.outletId !== data.expectedOutletId) {
        throw new AssetLeaseWorkflowError(
          "Asset location changed. Refresh and try again."
        )
      }

      const [latestTransfer] = await tx
        .select({
          id: assetTransfers.id,
          transferDate: assetTransfers.transferDate,
          status: assetTransfers.status,
        })
        .from(assetTransfers)
        .where(eq(assetTransfers.assetId, detail.assetId))
        .orderBy(desc(assetTransfers.createdAt), desc(assetTransfers.id))
        .limit(1)

      if ((latestTransfer?.id ?? null) !== data.expectedTransferId) {
        throw new AssetLeaseWorkflowError(
          "Asset was transferred by another user. Refresh and review the latest transfer."
        )
      }
      if (latestTransfer?.status === "PENDING") {
        throw new AssetLeaseWorkflowError(
          "Latest transfer must be received before another transfer"
        )
      }
      if (detail.receiveDate && data.transferDate < detail.receiveDate) {
        throw new AssetLeaseWorkflowError(
          "Transfer date cannot be before lease receive date"
        )
      }
      if (
        latestTransfer?.transferDate &&
        data.transferDate < latestTransfer.transferDate
      ) {
        throw new AssetLeaseWorkflowError(
          "Transfer date cannot be before latest transfer date"
        )
      }

      const [outlet] = await tx
        .select({
          id: outlets.id,
          outletId: outlets.outletId,
          branchId: branches.branchId,
          companyId: companies.id,
        })
        .from(outlets)
        .innerJoin(branches, eq(outlets.branchId, branches.branchId))
        .innerJoin(
          companies,
          eq(branches.companyId, companies.talentaCompanyId)
        )
        .where(
          and(
            eq(outlets.id, data.outletId),
            eq(outlets.isActive, true),
            eq(branches.isActive, true)
          )
        )
        .limit(1)

      if (!outlet || outlet.companyId !== detail.companyId) {
        throw new AssetLeaseWorkflowError(
          "Selected outlet must belong to the lease company"
        )
      }

      const selectedUser = await tx.query.users.findFirst({
        where: eq(users.id, data.userId),
        columns: { companyId: true, branchId: true },
      })

      if (
        !selectedUser ||
        selectedUser.companyId !== outlet.branchId ||
        selectedUser.branchId !== outlet.outletId
      ) {
        throw new AssetLeaseWorkflowError(
          "Selected user does not belong to the selected outlet"
        )
      }

      const [transfer] = await tx
        .insert(assetTransfers)
        .values({
          rentDtlId: detail.id,
          transferDate: data.transferDate,
          assetId: detail.assetId,
          outletId: data.outletId,
          userId: data.userId,
          status: "PENDING",
          createdBy: user.id,
        })
        .returning({ id: assetTransfers.id })
      if (!transfer) {
        throw new AssetLeaseWorkflowError("Failed to create asset transfer")
      }

      const [moved] = await tx
        .update(assetDatas)
        .set({ outletId: data.outletId, updatedBy: user.id })
        .where(
          and(
            eq(assetDatas.id, detail.assetId),
            eq(assetDatas.outletId, data.expectedOutletId),
            eq(assetDatas.status, "DISEWA")
          )
        )
        .returning({ id: assetDatas.id })
      if (!moved) {
        throw new AssetLeaseWorkflowError(
          "Asset location changed. Refresh and try again."
        )
      }

      return detail.assetId
    })

    revalidatePath(`/distribution/asset-lease/${data.rentId}`)
    revalidatePath("/distribution/asset-transfer-receipts")
    revalidatePath("/asset-transaction/received-asset")
    revalidatePath(`/asset-transaction/received-asset/${transferredAssetId}`)

    return { success: true, message: "Asset transferred successfully" }
  } catch (error) {
    if (error instanceof AssetLeaseWorkflowError) {
      return { success: false, message: error.message }
    }
    console.error("Failed to transfer asset", error)
    return { success: false, message: "Failed to transfer asset" }
  }
}

export async function assetLeaseReject(formData: FormData) {
  const user = await requireUser()
  const permission = await authorizeAction("asset-lease:update")
  if (!permission.authorized) return permission.response

  const id = String(formData.get("id") ?? "")
  const reason = String(formData.get("reason") ?? "")
  if (!z.uuid().safeParse(id).success) {
    return { success: false, message: "Asset lease not found" }
  }

  let prepared: PreparedRentDetail[] = []
  try {
    const existing = await db.query.rentAssets.findFirst({
      where: eq(rentAssets.id, id),
      columns: { status: true },
      with: { details: { columns: { id: true } } },
    })
    if (!existing || existing.status !== "NEW") {
      throw new AssetLeaseWorkflowError(
        "Asset lease not found or already decided"
      )
    }

    const validation = assetLeaseRejectSchema.safeParse({
      id,
      reason,
      details: existing.details.map((detail) => ({
        rentDetailId: detail.id,
        photos: collectDetailPhotos(formData, detail.id),
      })),
    })
    if (!validation.success) {
      throw new AssetLeaseWorkflowError(
        validation.error.issues[0]?.message ?? "Invalid rejection"
      )
    }

    prepared = await prepareDetailPhotos(
      validation.data.details.map((detail) => ({
        id: detail.rentDetailId,
        photos: detail.photos,
      }))
    )

    await db.transaction(async (tx) => {
      const [rejected] = await tx
        .update(rentAssets)
        .set({
          status: "REJECTED",
          receiveDate: null,
          reason: validation.data.reason,
          updatedBy: user.id,
        })
        .where(and(eq(rentAssets.id, id), eq(rentAssets.status, "NEW")))
        .returning({ id: rentAssets.id })
      if (!rejected) {
        throw new AssetLeaseWorkflowError(
          "Asset lease not found or already decided"
        )
      }

      const assetIds = tx
        .select({ assetId: rentAssetDetails.assetId })
        .from(rentAssetDetails)
        .where(eq(rentAssetDetails.rentAssetId, id))
      await tx
        .update(assetDatas)
        .set({ status: "TERSEDIA", updatedBy: user.id })
        .where(
          and(
            inArray(assetDatas.id, assetIds),
            eq(assetDatas.status, "BOOKED")
          )
        )

      await tx.insert(rentPhotoAssets).values(
        prepared.flatMap((detail) =>
          detail.photos.map((photo) => ({
            rentDtlId: detail.id,
            name: photo.name,
            path: photo.path,
            type: "REJECT" as const,
            createdBy: user.id,
          }))
        )
      )
    })

    revalidatePath("/distribution/asset-lease")
    revalidatePath(`/distribution/asset-lease/${id}`)
    return { success: true, message: "Asset lease rejected successfully" }
  } catch (error) {
    await cleanupRentPhotos(prepared.flatMap((detail) => detail.photos)).catch(
      () => {}
    )
    if (error instanceof AssetLeaseWorkflowError) {
      return { success: false, message: error.message }
    }
    console.error("Failed to reject asset lease", error)
    return { success: false, message: "Failed to reject asset lease" }
  }
}

export async function assetTransferReceive(formData: FormData) {
  const user = await requireUser()
  const transferId = String(formData.get("transferId") ?? "")
  const photos = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  const validation = assetTransferReceiptSchema.safeParse({ transferId, photos })
  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues[0]?.message ?? "Invalid receipt",
    }
  }

  let prepared: SavedPhoto[] = []
  try {
    const superAdmin = await isSuperAdmin(user.id)
    const transfer = await db.query.assetTransfers.findFirst({
      where: eq(assetTransfers.id, validation.data.transferId),
      columns: {
        id: true,
        rentDtlId: true,
        assetId: true,
        userId: true,
        status: true,
      },
    })
    if (!transfer) {
      throw new AssetLeaseWorkflowError("Asset transfer not found")
    }
    if (!superAdmin && transfer.userId !== user.id) {
      throw new AssetLeaseWorkflowError("Unauthorized")
    }
    if (transfer.status !== "PENDING") {
      throw new AssetLeaseWorkflowError("Asset transfer was already received")
    }

    prepared = await saveRentPhotos(
      transfer.rentDtlId ?? transfer.id,
      validation.data.photos
    )
    await db.transaction(async (tx) => {
      const [latestTransfer] = await tx
        .select({ id: assetTransfers.id })
        .from(assetTransfers)
        .where(eq(assetTransfers.assetId, transfer.assetId))
        .orderBy(desc(assetTransfers.createdAt), desc(assetTransfers.id))
        .limit(1)
      if (latestTransfer?.id !== transfer.id) {
        throw new AssetLeaseWorkflowError("Asset transfer is no longer current")
      }

      const [received] = await tx
        .update(assetTransfers)
        .set({
          status: "RECEIVED",
          receivedAt: new Date(),
          receivedBy: user.id,
          updatedBy: user.id,
        })
        .where(
          and(
            eq(assetTransfers.id, transfer.id),
            eq(assetTransfers.status, "PENDING")
          )
        )
        .returning({ id: assetTransfers.id })
      if (!received) {
        throw new AssetLeaseWorkflowError("Asset transfer was already received")
      }

      await tx.insert(rentPhotoAssets).values(
        prepared.map((photo) => ({
          rentDtlId: transfer.rentDtlId,
          transferId: transfer.id,
          name: photo.name,
          path: photo.path,
          type: "RECEIVE" as const,
          createdBy: user.id,
        }))
      )
    })

    revalidatePath("/distribution/asset-transfer-receipts")
    revalidatePath("/distribution/asset-lease")
    return { success: true, message: "Asset receipt confirmed successfully" }
  } catch (error) {
    await cleanupRentPhotos(prepared).catch(() => {})
    if (error instanceof AssetLeaseWorkflowError) {
      return { success: false, message: error.message }
    }
    console.error("Failed to receive asset transfer", error)
    return { success: false, message: "Failed to receive asset transfer" }
  }
}
