import z from "zod"

const prSpecificationInputSchema = z.object({
  id: z.uuid().optional(),
  specId: z.uuid(),
  specValue: z.string(),
})

const prDetailInputSchema = z.object({
  id: z.uuid().optional(),
  assetCodeId: z.uuid(),
  price: z.number().min(0),
  quantity: z.number().min(1),
  specifications: z.array(prSpecificationInputSchema),
})

export const purchaseRequestSchema = z.object({
  date: z.string().min(1),
  companyId: z.uuid(),
  assetCategoryId: z.uuid(),
  description: z.string().optional(),
  details: z.array(prDetailInputSchema).min(1),
})
export type purchaseRequestSchemaType = z.infer<typeof purchaseRequestSchema>

export const purchaseRequestRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(255, "Reason must be at most 255 characters"),
})
