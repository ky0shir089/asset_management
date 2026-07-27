import z from "zod"

export const userSchema = z.object({
  changePassword: z.boolean(),
  roleId: z.string().min(1),
})
export type userSchemaType = z.infer<typeof userSchema>
