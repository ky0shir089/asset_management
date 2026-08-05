import {
  MAX_PHOTO_FILE_COUNT,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
} from "@/lib/upload-constants"
import z from "zod"

const acceptedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export const rentPhotoFilesSchema = z
  .array(z.instanceof(File))
  .min(1, "Photos are required for each asset")
  .max(
    MAX_PHOTO_FILE_COUNT,
    `Upload at most ${MAX_PHOTO_FILE_COUNT} photos per asset`
  )
  .superRefine((files, ctx) => {
    files.forEach((file, index) => {
      if (!acceptedPhotoTypes.has(file.type)) {
        ctx.addIssue({
          code: "custom",
          path: [index],
          message: "Photos must be JPEG, PNG, or WebP",
        })
      }
      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        ctx.addIssue({
          code: "custom",
          path: [index],
          message: `Each photo must be at most ${MAX_PHOTO_FILE_SIZE_MB} MB`,
        })
      }
    })
  })

const assetLeaseDetailSchema = z.object({
  assetId: z.uuid("Asset is required"),
  amount: z.number().int().min(0, "Amount cannot be negative"),
  photos: rentPhotoFilesSchema,
})

export const assetLeaseSchema = z
  .object({
    companyId: z.uuid("Company is required"),
    dateStart: z.iso.date("Rent date is required"),
    note: z.string().trim().max(255).optional(),
    details: z.array(assetLeaseDetailSchema).min(1, "Add at least one asset"),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.details.forEach((detail, index) => {
      if (seen.has(detail.assetId)) {
        ctx.addIssue({
          code: "custom",
          path: ["details", index, "assetId"],
          message: "Asset is already selected",
        })
      }
      seen.add(detail.assetId)
    })
  })

const assetLeaseDecisionDetailSchema = z.object({
  rentDetailId: z.uuid("Leased asset not found"),
  photos: rentPhotoFilesSchema,
})

export const assetLeaseApproveSchema = z
  .object({
    id: z.uuid("Asset lease not found"),
    rentDate: z.iso.date("Invalid rent date"),
    receiveDate: z.iso.date("Receive date is required"),
    details: z
      .array(assetLeaseDecisionDetailSchema)
      .min(1, "Asset lease has no details"),
  })
  .superRefine((value, ctx) => {
    if (value.receiveDate < value.rentDate) {
      ctx.addIssue({
        code: "custom",
        path: ["receiveDate"],
        message: "Receive date cannot be before rent date",
      })
    }
  })

export const assetLeaseRejectReasons = [
  "Spesifikasi asset tidak sesuai",
  "Kondisi asset rusak / tidak sesuai",
  "Tidak jadi dibutuhkan / salah company",
] as const

export const assetLeaseRejectSchema = z.object({
  id: z.uuid("Asset lease not found"),
  reason: z.enum(assetLeaseRejectReasons, "Select a valid rejection reason"),
  details: z
    .array(assetLeaseDecisionDetailSchema)
    .min(1, "Asset lease has no details"),
})

export type assetLeaseDecisionDetailType = z.infer<
  typeof assetLeaseDecisionDetailSchema
>

export type assetLeaseSchemaType = z.infer<typeof assetLeaseSchema>
