import z from "zod"
import { integerIdStringSchema } from "./id-schema"

const assetSpecTypeSchema = z.enum(["TEXT", "SELECT"])

export const assetSpecSchema = z.object({
  codeId: integerIdStringSchema,
  name: z.string().min(1),
  type: assetSpecTypeSchema,
  dataTable: z.string().optional(),
  isRequired: z.boolean(),
  createable: z.boolean(),
})
export type assetSpecSchemaType = z.infer<typeof assetSpecSchema>
