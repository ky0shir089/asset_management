"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  assetDatas,
  assetTransfers,
  branches,
  companies,
  customers,
  outlets,
  rentAssetDetails,
  rentAssets,
  rentPhotoAssets,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { assetLeaseSchema } from "@/lib/formSchemas/asset-lease-schema"
import {
  cleanupRentFiles,
  MAX_PHOTO_FILE_COUNT,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
  MAX_PHOTO_UPLOAD_SIZE_BYTES,
  saveRentPhotos,
  type SavedPhoto,
} from "@/lib/local-upload"
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

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
  const photoGroups: File[][] = []
  let fileCount = 0
  let totalBytes = 0

  for (let index = 0; index < detailCount; index++) {
    const files = formData
      .getAll(`photos-${index}`)
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (files.length === 0) {
      throw new Error("Photos are required for each detail item")
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

    fileCount += files.length
    totalBytes += files.reduce((total, file) => total + file.size, 0)
    photoGroups.push(files)
  }

  if (fileCount > MAX_PHOTO_FILE_COUNT) {
    throw new Error(`Upload at most ${MAX_PHOTO_FILE_COUNT} photos`)
  }
  if (totalBytes > MAX_PHOTO_UPLOAD_SIZE_BYTES) {
    throw new Error(
      `Total photo size exceeds ${MAX_PHOTO_UPLOAD_SIZE_BYTES / 1024 / 1024} MB limit`
    )
  }

  return photoGroups
}

type PreparedRentDetail = {
  id: string
  photos: SavedPhoto[]
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

    const raw = {
      outletId: formData.get("outletId"),
      dateStart: formData.get("dateStart"),
      note: formData.get("note") || undefined,
      details,
    }

    const validation = assetLeaseSchema.safeParse(raw)

    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message ?? "Invalid form data",
      }
    }

    const data = validation.data

    let photoGroups: File[][]
    try {
      photoGroups = collectPhotoGroups(formData, data.details.length)
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Invalid photo upload",
      }
    }

    const preparedDetails: PreparedRentDetail[] = []

    try {
      for (const files of photoGroups) {
        const id = crypto.randomUUID()
        preparedDetails.push({ id, photos: [] })
        preparedDetails.at(-1)!.photos = await saveRentPhotos(id, files)
      }

      await db.transaction(async (tx) => {
        const [outlet] = await tx
          .select({ id: outlets.id })
          .from(outlets)
          .where(and(eq(outlets.id, data.outletId), eq(outlets.isActive, true)))
          .limit(1)

        if (!outlet) {
          throw new Error("Outlet not found or inactive")
        }

        const customerIds = [
          ...new Set(data.details.map((detail) => detail.customerId)),
        ]
        const selectedCustomers = await tx
          .select({ id: customers.id, outletId: customers.outletId })
          .from(customers)
          .where(inArray(customers.id, customerIds))

        if (
          selectedCustomers.length !== customerIds.length ||
          selectedCustomers.some(
            (customer) => customer.outletId !== data.outletId
          )
        ) {
          throw new Error("Every customer must belong to selected outlet")
        }

        const assetIds = [
          ...new Set(data.details.map((detail) => detail.assetId)),
        ]
        const lsaOutletIds = tx
          .select({ id: outlets.id })
          .from(outlets)
          .innerJoin(branches, eq(outlets.branchId, branches.id))
          .innerJoin(companies, eq(branches.companyId, companies.id))
          .where(eq(companies.code, "LSA"))

        const claimedAssets = await tx
          .update(assetDatas)
          .set({ status: "DISEWA", updatedBy: user.id })
          .where(
            and(
              inArray(assetDatas.id, assetIds),
              eq(assetDatas.status, "TERSEDIA"),
              inArray(assetDatas.outletId, lsaOutletIds)
            )
          )
          .returning({ id: assetDatas.id })

        if (claimedAssets.length !== assetIds.length) {
          throw new Error("One or more selected assets are no longer available")
        }

        await tx
          .update(assetDatas)
          .set({ outletId: data.outletId, updatedBy: user.id })
          .where(inArray(assetDatas.id, assetIds))

        await tx.insert(assetTransfers).values(
          assetIds.map((assetId) => ({
            transferDate: data.dateStart,
            assetId,
            outletId: data.outletId,
            userId: user.id,
            createdBy: user.id,
          }))
        )

        const rentNo = await generateRentNumber(tx)
        const [rentAsset] = await tx
          .insert(rentAssets)
          .values({
            rentNo,
            rentDate: data.dateStart,
            outletId: data.outletId,
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
            customerId: detail.customerId,
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
              createdBy: user.id,
            }))
          )
        )
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
