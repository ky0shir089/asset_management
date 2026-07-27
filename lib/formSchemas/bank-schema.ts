import z from "zod"

export const bankSchema = z.object({
  name: z.string().min(1),
})
export type bankSchemaType = z.infer<typeof bankSchema>
