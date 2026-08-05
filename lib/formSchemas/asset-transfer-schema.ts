import { rentPhotoFilesSchema } from "@/lib/formSchemas/asset-lease-schema"
import { standaloneAssetTransferSchema } from "./standalone-asset-transfer-schema"
import z from "zod"

export const assetTransferSchema = z
  .object({
    rentId: z.uuid("Asset lease not found"),
    rentDetailId: z.uuid("Leased asset not found"),
    transferDate: z.iso.date("Transfer date is required"),
    outletId: z.uuid("Outlet is required"),
    userId: z.string().trim().min(1, "User is required"),
    expectedOutletId: z.uuid("Current asset outlet is invalid"),
    expectedTransferId: z.uuid("Current transfer is invalid").nullable(),
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
  transferId: z.uuid("Asset transfer not found"),
  photos: rentPhotoFilesSchema,
})

export type assetTransferSchemaType = z.infer<typeof assetTransferSchema>
export type standaloneAssetTransferSchemaType = z.infer<
  typeof standaloneAssetTransferSchema
>
export type assetTransferReceiptSchemaType = z.infer<
  typeof assetTransferReceiptSchema
>
