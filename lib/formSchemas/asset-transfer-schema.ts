import { rentPhotoFilesSchema } from "@/lib/formSchemas/asset-lease-schema"
import { standaloneAssetTransferSchema } from "./standalone-asset-transfer-schema"
import z from "zod"
import { integerIdStringSchema } from "./id-schema"

export const ASSET_TRANSFER_CONDITIONS = [
  "BARU dan BAIK",
  "BARU dan RUSAK",
  "BEKAS dan BAIK",
  "BEKAS dan RUSAK",
] as const

export const assetTransferSchema = z
  .object({
    rentId: integerIdStringSchema,
    rentDetailId: integerIdStringSchema,
    transferDate: z.iso.date("Transfer date is required"),
    condition: z.enum(ASSET_TRANSFER_CONDITIONS, {
      message: "Condition is required",
    }),
    outletId: integerIdStringSchema,
    userId: z.string().trim().min(1, "User is required"),
    expectedOutletId: integerIdStringSchema,
    expectedTransferId: integerIdStringSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.outletId === value.expectedOutletId) {
      ctx.addIssue({
        code: "custom",
        path: ["outletId"],
        message: "Destination outlet must differ from current outlet",
      })
    }
  })

export { standaloneAssetTransferSchema }

export const assetTransferReceiptSchema = z.object({
  transferId: integerIdStringSchema,
  photos: rentPhotoFilesSchema,
})

export type assetTransferSchemaType = z.infer<typeof assetTransferSchema>
export type standaloneAssetTransferSchemaType = z.infer<
  typeof standaloneAssetTransferSchema
>
export type assetTransferReceiptSchemaType = z.infer<
  typeof assetTransferReceiptSchema
>
