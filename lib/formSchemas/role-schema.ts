import z from "zod"

export const roleSchema = z.object({
  name: z.string().min(1),
  menus: z.array(z.string()).min(1, "Select at least one menu"),
  permissions: z.array(z.number()).optional(),
})
export type roleSchemaType = z.infer<typeof roleSchema>
