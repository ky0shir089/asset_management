import z from "zod"

export const branchSchema = z.object({
  companyId: z.number().positive(),
  branchId: z.string().min(3),
  name: z.string().min(1),
  isActive: z.boolean(),
})
export type branchSchemaType = z.infer<typeof branchSchema>
