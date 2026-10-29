import { readFile, writeFile, mkdir, rm } from "node:fs/promises"
import { basename, join } from "node:path"
import { randomUUID } from "node:crypto"
import QRCode from "qrcode"

const UPLOAD_BASE = join(process.cwd(), "public", "uploads", "received-assets")
const RENT_UPLOAD_BASE = join(process.cwd(), "public", "uploads", "rent-assets")
const PAYMENT_PROOF_BASE = join(
  process.cwd(),
  "data",
  "uploads",
  "rent-payment-proofs"
)
const PURCHASE_ORDER_BASE = join(
  process.cwd(),
  "data",
  "uploads",
  "purchase-orders"
)

export interface SavedPhoto {
  name: string
  path: string
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
}

export {
  MAX_PHOTO_FILE_COUNT,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
  MAX_PHOTO_UPLOAD_SIZE_BYTES,
} from "./upload-constants"
import {
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
  MAX_PO_ATTACHMENT_SIZE_BYTES,
  MAX_PO_ATTACHMENT_SIZE_MB,
} from "./upload-constants"

/**
 * Validate, save asset-photo files, return metadata rows for photoAssets insert.
 * Creates folder public/uploads/received-assets/<receiveId>/photos/.
 */
export async function savePhotos(
  receiveId: string,
  files: File[]
): Promise<SavedPhoto[]> {
  const dir = join(UPLOAD_BASE, receiveId, "photos")
  await mkdir(dir, { recursive: true })

  const results: SavedPhoto[] = []

  try {
    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        throw new Error(
          `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp, application/pdf`
        )
      }
      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        throw new Error(
          `File "${file.name}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }

      const ext = MIME_EXT[file.type] ?? ".jpg"
      const filename = `${randomUUID()}${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      await writeFile(join(dir, filename), buffer)

      results.push({
        name: file.name,
        path: `/uploads/received-assets/${receiveId}/photos/${filename}`,
      })
    }

    return results
  } catch (err) {
    await rm(dir, { recursive: true, force: true })
    throw err
  }
}

/**
 * Generate QR PNG from nomorAssets, save to
 * public/uploads/received-assets/<receiveId>/qr.png.
 * Returns the public path.
 */
export async function saveQRCode(
  receiveId: string,
  nomorAssets: string
): Promise<string> {
  const dir = join(UPLOAD_BASE, receiveId)
  await mkdir(dir, { recursive: true })

  const filename = "qr.png"
  const filePath = join(dir, filename)

  await QRCode.toFile(filePath, nomorAssets, {
    type: "png",
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  })

  return `/uploads/received-assets/${receiveId}/${filename}`
}

/**
 * Remove all files and folders for a receiveId.
 * Called on transaction failure after files were written.
 */
export async function cleanupReceiveFiles(receiveId: string): Promise<void> {
  const dir = join(UPLOAD_BASE, receiveId)
  await rm(dir, { recursive: true, force: true })
}

/**
 * Save rent-asset-detail photo files.
 * Creates folder public/uploads/rent-assets/<rentDtlId>/photos/.
 */
export async function saveRentPhotos(
  rentDtlId: string,
  files: File[]
): Promise<SavedPhoto[]> {
  const dir = join(RENT_UPLOAD_BASE, rentDtlId, "photos")
  await mkdir(dir, { recursive: true })

  const results: SavedPhoto[] = []

  try {
    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        throw new Error(
          `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp, application/pdf`
        )
      }
      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        throw new Error(
          `File "${file.name}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }

      const ext = MIME_EXT[file.type] ?? ".jpg"
      const filename = `${randomUUID()}${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      await writeFile(join(dir, filename), buffer)

      results.push({
        name: file.name,
        path: `/uploads/rent-assets/${rentDtlId}/photos/${filename}`,
      })
    }

    return results
  } catch (err) {
    await cleanupRentPhotos(results)
    throw err
  }
}

export async function cleanupRentPhotos(photos: SavedPhoto[]): Promise<void> {
  await Promise.all(
    photos.map((photo) => {
      const filename = basename(photo.path)
      const rentDtlId = photo.path.split("/")[3]
      if (!rentDtlId || !filename) return Promise.resolve()
      return rm(join(RENT_UPLOAD_BASE, rentDtlId, "photos", filename), {
        force: true,
      })
    })
  )
}

/**
 * Remove all files for a rent asset detail.
 */
export async function cleanupRentFiles(rentDtlId: string): Promise<void> {
  const dir = join(RENT_UPLOAD_BASE, rentDtlId)
  await rm(dir, { recursive: true, force: true })
}

export async function savePurchaseOrderAttachment(
  purchaseOrderId: string,
  file: File
): Promise<SavedPhoto> {
  if (!/^\d+$/.test(purchaseOrderId)) {
    throw new Error("Invalid purchase order ID")
  }
  if (file.type !== "application/pdf") {
    throw new Error("Attachment must be a PDF")
  }
  if (file.size === 0 || !(await file.slice(0, 5).text()).startsWith("%PDF-")) {
    throw new Error("Attachment must be a valid PDF")
  }
  if (file.size > MAX_PO_ATTACHMENT_SIZE_BYTES) {
    throw new Error(`Attachment exceeds ${MAX_PO_ATTACHMENT_SIZE_MB} MB limit`)
  }

  const filename = `${randomUUID()}.pdf`
  const dir = join(PURCHASE_ORDER_BASE, purchaseOrderId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))
  return { name: file.name, path: filename }
}

export async function readPurchaseOrderAttachment(
  purchaseOrderId: string,
  filename: string
) {
  if (!/^\d+$/.test(purchaseOrderId) || !/^[a-f0-9-]+\.pdf$/i.test(filename)) {
    return null
  }
  try {
    return {
      buffer: await readFile(
        join(PURCHASE_ORDER_BASE, purchaseOrderId, filename)
      ),
      contentType: "application/pdf",
    }
  } catch {
    return null
  }
}

export async function cleanupPurchaseOrderAttachment(
  purchaseOrderId: string,
  filename: string
) {
  if (!/^\d+$/.test(purchaseOrderId) || !/^[a-f0-9-]+\.pdf$/i.test(filename)) {
    return
  }
  await rm(join(PURCHASE_ORDER_BASE, purchaseOrderId, filename), {
    force: true,
  })
}

export async function saveRentPaymentProof(file: File): Promise<SavedPhoto> {
  if (!ALLOWED_MIME.has(file.type))
    throw new Error("Invalid payment proof type")
  if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
    throw new Error(`Payment proof exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`)
  }

  const ext = MIME_EXT[file.type]
  const filename = `${randomUUID()}${ext}`
  const dir = PAYMENT_PROOF_BASE
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))
  return { name: file.name, path: filename }
}

export async function cleanupRentPaymentProof(filename: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(filename)) return
  await rm(join(PAYMENT_PROOF_BASE, filename), { force: true })
}

export async function readRentPaymentProof(filename: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(filename)) return null
  const contentType = Object.entries(MIME_EXT).find(
    ([, ext]) => ext === `.${filename.split(".").at(-1)}`
  )?.[0]
  if (!contentType) return null
  try {
    return {
      buffer: await readFile(join(PAYMENT_PROOF_BASE, filename)),
      contentType,
    }
  } catch {
    return null
  }
}
