import z from "zod"

export const outletSchema = z.object({
  branchId: z.uuid(),
  outletId: z.string().min(5),
  name: z.string().min(1),
  isActive: z.boolean(),
})
export type outletSchemaType = z.infer<typeof outletSchema>
