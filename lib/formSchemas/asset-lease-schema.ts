import {
  MAX_PHOTO_FILE_COUNT,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
} from "@/lib/upload-constants"
import z from "zod"

const acceptedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"])

const photoFilesSchema = z
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
  photos: photoFilesSchema,
})

export const assetLeaseSchema = z
  .object({
    companyId: z.uuid("Company is required"),
    dateStart: z.iso.date("Rent date is required"),
    note: z.string().trim().max(255).optional(),
    details: z
      .array(assetLeaseDetailSchema)
      .min(1, "Add at least one asset")
      .max(10, "Add at most 10 assets"),
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

export const assetLeaseApproveSchema = z
  .object({
    id: z.uuid("Asset lease not found"),
    rentDate: z.iso.date("Invalid rent date"),
    receiveDate: z.iso.date("Receive date is required"),
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

export const assetLeaseRejectSchema = z.object({
  id: z.uuid("Asset lease not found"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(255, "Reason must be at most 255 characters"),
})

export type assetLeaseSchemaType = z.infer<typeof assetLeaseSchema>
