import assert from "node:assert/strict"
import { invoiceTotals } from "./rent-billing-schema"

assert.deepEqual(
  invoiceTotals(
    [
      { quantity: 1, unitAmount: 100_000 },
      { quantity: 2, unitAmount: 25_000 },
    ],
    11,
    2,
    5_000
  ),
  {
    subtotal: 150_000,
    vatAmount: 16_500,
    withholdingAmount: 3_000,
    depositDeduction: 5_000,
    total: 158_500,
  }
)

assert.throws(
  () =>
    invoiceTotals(
      [
        { quantity: 1, unitAmount: 1_500_000_000 },
        { quantity: 1, unitAmount: 1_500_000_000 },
      ],
      0,
      0,
      0
    ),
  /Invoice total is outside supported range/
)

assert.deepEqual(
  invoiceTotals([{ quantity: 1, unitAmount: 100_000 }], 11, 2, 200_000),
  {
    subtotal: 100_000,
    vatAmount: 11_000,
    withholdingAmount: 2_000,
    depositDeduction: 109_000,
    total: 0,
  }
)

assert.equal(
  invoiceTotals([{ quantity: 1, unitAmount: 10 }], 0, 0, 10).total,
  0
)
