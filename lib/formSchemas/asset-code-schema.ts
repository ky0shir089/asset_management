import z from "zod"

export const assetCodeSchema = z.object({
  categoryId: z.uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
})
export type assetCodeSchemaType = z.infer<typeof assetCodeSchema>
