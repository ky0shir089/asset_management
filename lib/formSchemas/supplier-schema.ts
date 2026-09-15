import z from "zod"

export const supplierAccountInputSchema = z.object({
  id: z.uuid().optional(),
  bankId: z.uuid(),
  accountNo: z.string().min(1),
  accountName: z.string().min(1),
})

export const supplierSchema = z.object({
  name: z.string().min(1),
  address: z.string().trim().min(1, "Address is required").max(255),
  provinceId: z.string().min(1, "Province is required"),
  regencyId: z.string().min(1, "Regency is required"),
  districtId: z.string().min(1, "District is required"),
  villageId: z
    .number()
    .int()
    .positive("Village is required"),
  accounts: z.array(supplierAccountInputSchema).min(1),
})
export type supplierSchemaType = z.infer<typeof supplierSchema>
