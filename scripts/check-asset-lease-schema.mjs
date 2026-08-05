import assert from "node:assert/strict"
import { registerHooks } from "node:module"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        context
      )
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.match(/\.[a-z]+$/i)
    ) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})

const { assetLeaseApproveSchema, assetLeaseRejectSchema } =
  await import("@/lib/formSchemas/asset-lease-schema")
const { assetTransferReceiptSchema, assetTransferSchema } =
  await import("@/lib/formSchemas/asset-transfer-schema")

const id = "00000000-0000-4000-8000-000000000001"
const detailId = "00000000-0000-4000-8000-000000000002"
const outletId = "00000000-0000-4000-8000-000000000003"
const currentOutletId = "00000000-0000-4000-8000-000000000004"
const photo = new File(["photo"], "asset.jpg", { type: "image/jpeg" })
const details = [{ rentDetailId: detailId, photos: [photo] }]

assert.equal(
  assetLeaseApproveSchema.safeParse({
    id,
    rentDate: "2026-07-27",
    receiveDate: "2026-07-27",
    details,
  }).success,
  true
)
assert.equal(
  assetLeaseApproveSchema.safeParse({
    id,
    rentDate: "2026-07-27",
    receiveDate: "2026-07-26",
    details,
  }).success,
  false
)
assert.equal(
  assetLeaseApproveSchema.safeParse({
    id,
    rentDate: "2026-07-27",
    receiveDate: "2026-07-27",
    details: [{ rentDetailId: detailId, photos: [] }],
  }).success,
  false
)
assert.equal(
  assetLeaseRejectSchema.safeParse({
    id,
    reason: "Spesifikasi asset tidak sesuai",
    details,
  }).success,
  true
)
assert.equal(
  assetTransferReceiptSchema.safeParse({ transferId: id, photos: [] }).success,
  false
)
assert.equal(
  assetTransferReceiptSchema.safeParse({ transferId: id, photos: [photo] })
    .success,
  true
)

const transfer = {
  rentId: id,
  rentDetailId: detailId,
  transferDate: "2026-07-27",
  outletId,
  userId: "user-1",
  expectedOutletId: currentOutletId,
  expectedTransferId: null,
}
assert.equal(assetTransferSchema.safeParse(transfer).success, true)
assert.equal(
  assetTransferSchema.safeParse({ ...transfer, outletId: currentOutletId })
    .success,
  false
)

console.log("asset lease workflow schema checks passed")
