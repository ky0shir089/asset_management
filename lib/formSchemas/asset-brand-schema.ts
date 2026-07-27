import z from "zod"

export const assetBrandSchema = z.object({
  name: z.string().min(1),
})
export type assetBrandSchemaType = z.infer<typeof assetBrandSchema>
