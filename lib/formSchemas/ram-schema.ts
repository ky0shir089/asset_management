import z from "zod"

export const ramSchema = z.object({
  name: z.string().min(1),
})
export type ramSchemaType = z.infer<typeof ramSchema>
