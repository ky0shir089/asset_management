import z from "zod"

export const storageSchema = z.object({
  name: z.string().min(1),
})
export type storageSchemaType = z.infer<typeof storageSchema>
