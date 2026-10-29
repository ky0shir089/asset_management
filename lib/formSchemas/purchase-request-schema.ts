import z from "zod"
import { integerIdStringSchema } from "./id-schema"

const prSpecificationInputSchema = z.object({
  id: integerIdStringSchema.optional(),
  specId: integerIdStringSchema,
  specValue: z.string(),
})

const prDetailInputSchema = z.object({
  id: integerIdStringSchema.optional(),
  assetCodeId: integerIdStringSchema,
  price: z.number().min(0),
  quantity: z.number().min(1),
  specifications: z.array(prSpecificationInputSchema),
})

export const purchaseRequestSchema = z.object({
  date: z.string().min(1),
  companyId: integerIdStringSchema,
  assetCategoryId: integerIdStringSchema,
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
