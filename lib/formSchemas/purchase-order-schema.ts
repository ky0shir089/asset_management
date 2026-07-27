import z from "zod"

export const poDetailInputSchema = z.object({
  id: z.uuid().optional(),
  prDtlId: z.uuid(),
  quantity: z.number().min(1),
  price: z.number().min(0),
})

export const purchaseOrderSchema = z.object({
  date: z.iso.date(),
  prId: z.uuid(),
  supplierId: z.uuid(),
  description: z.string().min(1),
  shippingCost: z.number().min(0),
  details: z.array(poDetailInputSchema).min(1),
})

export type purchaseOrderSchemaType = z.infer<typeof purchaseOrderSchema>
