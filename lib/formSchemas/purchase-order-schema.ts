import z from "zod"
import { integerIdStringSchema } from "./id-schema"

export const poDetailInputSchema = z.object({
  id: integerIdStringSchema.optional(),
  prDtlId: integerIdStringSchema,
  quantity: z.number().min(1),
  price: z.number().min(0),
})

export const purchaseOrderSchema = z.object({
  date: z.iso.date(),
  prId: integerIdStringSchema,
  supplierId: integerIdStringSchema,
  supplierAccountId: integerIdStringSchema.optional(),
  pvNo: z.string().trim().max(255).optional(),
  description: z.string().min(1),
  shippingCost: z.number().min(0),
  details: z.array(poDetailInputSchema).min(1),
})

export type purchaseOrderSchemaType = z.infer<typeof purchaseOrderSchema>
