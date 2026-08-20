import z from "zod"

export const maintenanceSchema = z.object({
  assetId: z.string().uuid(),
  detail: z
    .string()
    .min(1, "Detail maintenance wajib diisi")
    .refine(
      (val) => val.replace(/<[^>]*>/g, "").trim().length > 0,
      "Detail maintenance wajib diisi"
    ),
  amount: z.number().int().min(0, "Biaya tidak boleh negatif"),
})

export type maintenanceSchemaType = z.infer<typeof maintenanceSchema>
