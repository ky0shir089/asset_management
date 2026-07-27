import z from "zod"

export const receivedAssetSchema = z.object({
  poId: z.string().uuid(),
  poDetailId: z.string().uuid(),
  outletId: z.string().uuid(),
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
