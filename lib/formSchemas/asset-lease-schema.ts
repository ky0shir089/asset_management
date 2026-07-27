import z from "zod"

const isoDate = /^\d{4}-\d{2}-\d{2}$/

const assetLeaseDetailSchema = z
  .object({
    assetId: z.uuid("Asset is required"),
    customerId: z.uuid("Customer is required"),
    amount: z.number().int().min(0, "Amount cannot be negative"),
    photos: z.any().optional(),
  })

export const assetLeaseSchema = z
  .object({
    outletId: z.uuid("Outlet is required"),
    dateStart: z.string().regex(isoDate, "Start date is required"),
    note: z.string().trim().max(255).optional(),
    details: z.array(assetLeaseDetailSchema).min(1, "Add at least one detail"),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()

    value.details.forEach((detail, index) => {
      if (seen.has(detail.assetId)) {
        ctx.addIssue({
          code: "custom",
          path: ["details", index, "assetId"],
          message: "Asset is already selected",
        })
      }

      seen.add(detail.assetId)
    })
  })

export type assetLeaseSchemaType = z.infer<typeof assetLeaseSchema>
