import z from "zod"

export const moduleSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  position: z.number().positive(),
})
export type moduleSchemaType = z.infer<typeof moduleSchema>
