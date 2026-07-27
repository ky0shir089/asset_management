import z from "zod"

export const assetCategorySchema = z.object({
  name: z.string().min(1),
})
export type assetCategorySchemaType = z.infer<typeof assetCategorySchema>
