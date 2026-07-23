"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  poDetails,
  assetDatas,
  photoAssets,
  outlets,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { receivedAssetSchema } from "@/lib/formSchemas/received-asset-schema"
import {
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
  cleanupReceiveFiles,
  savePhotos,
  saveQRCode,
} from "@/lib/local-upload"
import { eq, like, sql } from "drizzle-orm"

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-]/g, "")
}

const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

type CreatedReceiveAsset = {
  id: string
  nomorAssets: string
}

function collectPhotoGroups(
  formData: FormData,
  receivedQuantity: number
): File[][] {
  const photoGroups: File[][] = []

  for (let index = 0; index < receivedQuantity; index++) {
    const files = formData
      .getAll(`photos-${index}`)
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (files.length < 1) {
      throw new Error(
        `Please upload at least one asset photo for asset ${index + 1}`
      )
    }

    for (const file of files) {
      if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp`
        )
      }
      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        throw new Error(
          `File "${file.name}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }
    }

    photoGroups.push(files)
  }

  return photoGroups
}

export async function receivedAssetStore(formData: FormData) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("received-asset:create")
    if (!permission.authorized) {
      return permission.response
    }

    // --- Parse non-file fields ---
    const raw = {
      poId: formData.get("poId"),
      poDetailId: formData.get("poDetailId"),
      outletId: formData.get("outletId"),
      condition: formData.get("condition"),
      receivedQuantity: formData.get("receivedQuantity"),
    }

    const validation = receivedAssetSchema.safeParse(raw)
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message ?? "Invalid form data",
      }
    }

    const { poId, poDetailId, outletId, condition, receivedQuantity } =
      validation.data

    // --- Verify PO detail & ownership ---
    const pod = await db.query.poDetails.findFirst({
      where: eq(poDetails.id, poDetailId),
      columns: { id: true, poId: true, quantity: true, prDtlId: true },
      with: {
        purchaseOrder: {
          columns: { id: true, status: true, createdBy: true },
          with: {
            purchaseRequest: {
              columns: { id: true, companyId: true },
            },
          },
        },
        prDetail: {
          columns: { id: true },
          with: {
            assetCode: {
              columns: { id: true, code: true, categoryId: true },
              with: {
                category: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    })

    if (!pod) {
      return { success: false, message: "Purchase order detail not found" }
    }
    if (pod.poId !== poId) {
      return {
        success: false,
        message: "Purchase order detail does not belong to this purchase order",
      }
    }

    const superAdmin = await isSuperAdmin(user.id)
    if (!superAdmin && pod.purchaseOrder.createdBy !== user.id) {
      return { success: false, message: "You do not own this purchase order" }
    }

    if (!pod.prDetail?.assetCode) {
      return { success: false, message: "Asset code not found for this PO detail" }
    }

    // --- Verify outlet company match ---
    const outlet = await db.query.outlets.findFirst({
      where: eq(outlets.id, outletId),
      with: {
        branch: {
          columns: { companyId: true },
        },
      },
    })
    if (!outlet) {
      return { success: false, message: "Outlet not found" }
    }
    const prCompanyId = pod.purchaseOrder.purchaseRequest.companyId
    if (outlet.branch.companyId !== prCompanyId) {
      return {
        success: false,
        message:
          "Selected outlet must belong to the same company as the purchase request",
      }
    }

    const [{ count: receivedCountBeforeLock }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetDatas)
      .where(eq(assetDatas.poDetailId, poDetailId))

    const remainingBeforeLock = Math.max(
      0,
      (pod.quantity ?? 0) - Number(receivedCountBeforeLock)
    )

    if (receivedQuantity > remainingBeforeLock) {
      return {
        success: false,
        message: `Only ${remainingBeforeLock} asset(s) remaining for this purchase order detail`,
      }
    }

    let photoGroups: File[][]
    try {
      photoGroups = collectPhotoGroups(formData, receivedQuantity)
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Invalid photo upload",
      }
    }

    // --- Snapshot category/code from assetCode ---
    const assetCode = pod.prDetail.assetCode
    const categoryName = assetCode.category?.name ?? "UNKNOWN"
    const codeValue = assetCode.code

    // --- Transaction: lock, check remaining, insert receive assets, allocate counters ---
    const createdAssets: CreatedReceiveAsset[] = []
    const qrPaths: Array<string | null> = []

    try {
      await db.transaction(async (tx) => {
        // 1. Lock PO detail
        const [lockedPod] = await tx
          .select({ id: poDetails.id, quantity: poDetails.quantity })
          .from(poDetails)
          .where(eq(poDetails.id, poDetailId))
          .for("update")

        if (!lockedPod) {
          throw new Error("Purchase order detail not found")
        }

        // 2. Count already received
        const [{ count: receivedCount }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(assetDatas)
          .where(eq(assetDatas.poDetailId, poDetailId))

        const orderedQty = lockedPod.quantity ?? 0
        const remainingQty = orderedQty - Number(receivedCount)
        if (remainingQty <= 0) {
          throw new Error(
            "No remaining quantity available for this purchase order detail"
          )
        }
        if (receivedQuantity > remainingQty) {
          throw new Error(
            `Only ${remainingQty} asset(s) remaining for this purchase order detail`
          )
        }

        // 3. Allocate nomor_assets sequence from last existing
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const prefix = `${year}/${String(month).padStart(2, "0")}/${normalizeSlug(categoryName)}/${normalizeSlug(codeValue)}/`

        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)

        const lastMatch = await tx
          .select({ nomorAssets: assetDatas.nomorAssets })
          .from(assetDatas)
          .where(like(assetDatas.nomorAssets, `${prefix}%`))
          .orderBy(
            sql`length(${assetDatas.nomorAssets}) desc, ${assetDatas.nomorAssets} desc`
          )
          .limit(1)

        const lastSeq =
          lastMatch.length > 0
            ? Number(lastMatch[0].nomorAssets.split("/").pop() ?? 0)
            : 0

        const assetsToCreate = Array.from(
          { length: receivedQuantity },
          (_, index) => ({
            id: crypto.randomUUID(),
            nomorAssets: `${prefix}${String(lastSeq + index + 1).padStart(5, "0")}`,
          })
        )

        // 4. Insert receive assets (no photo/QR data yet)
        await tx.insert(assetDatas).values(
          assetsToCreate.map((asset) => ({
            id: asset.id,
            poDetailId,
            outletId,
            condition,
            status: "TERSEDIA",
            nomorAssets: asset.nomorAssets,
            createdBy: user.id,
          }))
        )

        createdAssets.push(...assetsToCreate)
      })

      // --- Post-transaction: save photos & QR per created asset ---
      for (const [index, asset] of createdAssets.entries()) {
        try {
          const savedPhotos = await savePhotos(asset.id, photoGroups[index] ?? [])
          if (savedPhotos.length > 0) {
            await db.insert(photoAssets).values(
              savedPhotos.map((p) => ({
                receiveId: asset.id,
                name: p.name,
                path: p.path,
                createdBy: user.id,
              }))
            )
          }
        } catch {
          // Photo save failed — clean up files but keep receive asset
          await cleanupReceiveFiles(asset.id).catch(() => {})
        }

        try {
          const qrPath = await saveQRCode(asset.id, asset.nomorAssets)
          await db
            .update(assetDatas)
            .set({ qrCodePath: qrPath })
            .where(eq(assetDatas.id, asset.id))
          qrPaths[index] = qrPath
        } catch {
          // QR failure — asset exists, number is valid
          qrPaths[index] = null
        }
      }
    } catch (err) {
      await Promise.all(
        createdAssets.map((asset) => cleanupReceiveFiles(asset.id).catch(() => {}))
      )
      return {
        success: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      }
    }

    const firstAsset = createdAssets[0]
    const lastAsset = createdAssets[createdAssets.length - 1]
    const message =
      createdAssets.length === 1
        ? `Asset received successfully. Number: ${firstAsset.nomorAssets}`
        : `Assets received successfully. Count: ${createdAssets.length}. Numbers: ${firstAsset.nomorAssets} - ${lastAsset.nomorAssets}`

    return {
      success: true,
      message,
      data: {
        assets: createdAssets.map((asset, index) => ({
          id: asset.id,
          nomorAssets: asset.nomorAssets,
          qrCodePath: qrPaths[index] ?? null,
        })),
      },
    }
  } catch (error) {
    console.log(error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
