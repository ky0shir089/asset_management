import { z } from "zod"
import { integerIdStringSchema } from "./id-schema"

const moneySchema = z.coerce.number().int().min(0).max(2_000_000_000)
const rateSchema = z.coerce.number().int().min(0).max(100)
const dateSchema = z.iso.date()

export const invoicePeriodSchema = z.object({
  companyId: integerIdStringSchema,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
})

export const invoiceDraftSchema = z.object({
  dueDate: dateSchema,
  vatRate: rateSchema,
  withholdingRate: rateSchema,
  depositDeduction: moneySchema,
  items: z
    .array(
      z.object({
        id: integerIdStringSchema.optional(),
        description: z.string().trim().min(1).max(255),
        itemType: z.enum(["RENT", "ADDITIONAL"]),
        billingTiming: z.enum(["IN_ADVANCE", "IN_ARREARS"]).nullable(),
        rentDetailId: integerIdStringSchema.nullable(),
        assetId: integerIdStringSchema.nullable(),
        quantity: z.coerce.number().int().min(1).max(1_000_000),
        unitAmount: z.coerce.number().int().min(0).max(2_000_000_000),
      })
    )
    .min(1)
    .max(500),
}).superRefine((invoice, ctx) => {
  const rentDetailIds = new Set<string>()
  invoice.items.forEach((item, index) => {
    if (item.itemType !== "RENT") return
    if (!item.rentDetailId) {
      ctx.addIssue({ code: "custom", path: ["items", index, "rentDetailId"], message: "Rental item must reference a lease detail" })
    }
    if (!item.billingTiming) {
      ctx.addIssue({ code: "custom", path: ["items", index, "billingTiming"], message: "Choose billing timing for each rental item" })
    }
    if (item.rentDetailId && rentDetailIds.has(item.rentDetailId)) {
      ctx.addIssue({ code: "custom", path: ["items", index, "rentDetailId"], message: "Lease detail appears more than once" })
    }
    if (item.rentDetailId) rentDetailIds.add(item.rentDetailId)
  })
})

export const invoiceIdSchema = integerIdStringSchema

export const invoiceCancelSchema = z.object({
  invoiceId: invoiceIdSchema,
  reason: z.string().trim().min(1).max(500),
})

export const invoicePaymentSchema = z.object({
  invoiceId: invoiceIdSchema,
  paidAt: dateSchema,
  method: z.enum(["BANK_TRANSFER", "CASH", "OTHER"]),
  amount: z.coerce.number().int().positive().max(2_000_000_000),
  reference: z.string().trim().max(255).optional(),
  proof: z
    .instanceof(File)
    .optional()
    .refine((file) => !file || file.size <= 1_048_576, "Proof file must be at most 1 MB")
    .refine(
      (file) => !file || new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]).has(file.type),
      "Proof must be JPEG, PNG, WebP, or PDF"
    ),
})

export function invoiceTotals(
  items: Array<{ quantity: number; unitAmount: number }>,
  vatRate: number,
  withholdingRate: number,
  depositDeduction: number
) {
  const subtotal = items.reduce(
    (total, item) => total + item.quantity * item.unitAmount,
    0
  )
  const vatAmount = Math.round((subtotal * vatRate) / 100)
  const withholdingAmount = Math.round((subtotal * withholdingRate) / 100)
  const appliedDeposit = Math.min(
    depositDeduction,
    subtotal + vatAmount - withholdingAmount
  )
  const total = subtotal + vatAmount - withholdingAmount - appliedDeposit
  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(vatAmount) ||
    !Number.isSafeInteger(withholdingAmount) ||
    !Number.isSafeInteger(appliedDeposit) ||
    !Number.isSafeInteger(total) ||
    subtotal > 2_000_000_000 ||
    vatAmount > 2_000_000_000 ||
    withholdingAmount > 2_000_000_000 ||
    depositDeduction > 2_000_000_000 ||
    total < 0 ||
    total > 2_000_000_000
  ) {
    throw new Error("Invoice total is outside supported range")
  }
  return {
    subtotal,
    vatAmount,
    withholdingAmount,
    depositDeduction: appliedDeposit,
    total,
  }
}
