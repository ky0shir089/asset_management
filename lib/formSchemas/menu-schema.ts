import z from "zod"
import { integerIdStringSchema } from "./id-schema"

export const menuSchema = z.object({
  moduleId: integerIdStringSchema,
  name: z.string().min(1),
  path: z.string().min(1),
  position: z.number().positive(),
  isActive: z.boolean(),
  key: z.string().optional(),
})
export type menuSchemaType = z.infer<typeof menuSchema>
