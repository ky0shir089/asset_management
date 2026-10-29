import z from "zod"

export const companySchema = z.object({
  talentaCompanyId: z.number().positive(),
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean(),
})
export type companySchemaType = z.infer<typeof companySchema>
