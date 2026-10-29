import z from "zod"
import { integerIdStringSchema } from "./id-schema"

export const receivedAssetSchema = z.object({
  poId: integerIdStringSchema,
  poDetailId: integerIdStringSchema,
  outletId: integerIdStringSchema,
  condition: z.enum([
    "BARU dan BAIK",
    "BARU dan RUSAK",
    "BEKAS dan BAIK",
    "BEKAS dan RUSAK",
  ]),
  receivedQuantity: z.coerce
    .number()
    .int("Received quantity must be a whole number")
    .min(1, "Received quantity must be at least 1"),
})
