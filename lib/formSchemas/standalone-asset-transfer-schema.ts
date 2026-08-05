import z from "zod"

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export const standaloneAssetTransferSchema = z.object({
  companyId: z.uuid("Company is required"),
  assetId: z.uuid("Asset is required"),
  transferDate: z
    .iso
    .date("Transfer date is required")
    .refine((date) => date <= jakartaToday(), "Transfer date cannot be in the future"),
  userId: z.string().trim().min(1, "User is required"),
  expectedOutletId: z.uuid("Current asset outlet is invalid"),
  expectedTransferId: z.uuid("Current transfer is invalid").nullable(),
})
