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
    return nextResolve(specifier, context)
  },
})

const { assetLeaseApproveSchema, assetLeaseRejectSchema } =
  await import("@/lib/formSchemas/asset-lease-schema")

const id = "00000000-0000-4000-8000-000000000001"

assert.equal(
  assetLeaseApproveSchema.safeParse({
    id,
    rentDate: "2026-07-27",
    receiveDate: "2026-07-27",
  }).success,
  true
)
assert.equal(
  assetLeaseApproveSchema.safeParse({
    id,
    rentDate: "2026-07-27",
    receiveDate: "2026-07-26",
  }).success,
  false
)
assert.equal(
  assetLeaseApproveSchema.safeParse({
    id,
    rentDate: "2026-07-27",
    receiveDate: "2026-02-30",
  }).success,
  false
)
assert.equal(
  assetLeaseRejectSchema.safeParse({ id, reason: "   " }).success,
  false
)
assert.equal(
  assetLeaseRejectSchema.safeParse({ id, reason: "x".repeat(256) }).success,
  false
)
assert.equal(
  assetLeaseRejectSchema.parse({ id, reason: "  Asset damaged  " }).reason,
  "Asset damaged"
)

console.log("asset lease schema checks passed")
