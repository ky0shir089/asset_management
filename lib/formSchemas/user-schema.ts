import z from "zod"
import { integerIdStringSchema } from "./id-schema"

export const userSchema = z.object({
  changePassword: z.boolean(),
  roleId: integerIdStringSchema,
})
export type userSchemaType = z.infer<typeof userSchema>
