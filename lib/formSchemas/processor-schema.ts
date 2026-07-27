import z from "zod"

export const processorSchema = z.object({
  name: z.string().min(1),
})
export type processorSchemaType = z.infer<typeof processorSchema>
