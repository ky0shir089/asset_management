import z from "zod"
import { integerIdStringSchema } from "./id-schema"

export const assetCodeSchema = z.object({
  categoryId: integerIdStringSchema,
  code: z.string().min(1),
  name: z.string().min(1),
})
export type assetCodeSchemaType = z.infer<typeof assetCodeSchema>
