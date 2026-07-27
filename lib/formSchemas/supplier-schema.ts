import z from "zod"

export const supplierAccountInputSchema = z.object({
  id: z.uuid().optional(),
  bankId: z.uuid(),
  accountNo: z.string().min(1),
  accountName: z.string().min(1),
})

export const supplierSchema = z.object({
  name: z.string().min(1),
  accounts: z.array(supplierAccountInputSchema).min(1),
})
export type supplierSchemaType = z.infer<typeof supplierSchema>
