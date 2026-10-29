import z from "zod"
import { integerIdStringSchema } from "./id-schema"

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export const standaloneAssetTransferSchema = z.object({
  companyId: integerIdStringSchema,
  assetId: integerIdStringSchema,
  transferDate: z.iso
    .date("Transfer date is required")
    .refine(
      (date) => date <= jakartaToday(),
      "Transfer date cannot be in the future"
    ),
  userId: z.string().trim().min(1, "User is required"),
  expectedOutletId: integerIdStringSchema,
  expectedTransferId: integerIdStringSchema.nullable(),
})
