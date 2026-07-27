import { writeFile, mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import QRCode from "qrcode"

const UPLOAD_BASE = join(process.cwd(), "public", "uploads", "received-assets")
const RENT_UPLOAD_BASE = join(process.cwd(), "public", "uploads", "rent-assets")

export interface SavedPhoto {
  name: string
  path: string
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
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
          `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp`
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
          `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp`
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
    await rm(dir, { recursive: true, force: true })
    throw err
  }
}

/**
 * Remove all files for a rent asset detail.
 */
export async function cleanupRentFiles(rentDtlId: string): Promise<void> {
  const dir = join(RENT_UPLOAD_BASE, rentDtlId)
  await rm(dir, { recursive: true, force: true })
}
