import assert from "node:assert/strict"

function monthDays(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function prorata(monthlyAmount, start, end, year, month) {
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  const activeStart = start > periodStart ? start : periodStart
  const activeEnd = end && end < periodEnd ? end : periodEnd
  const days = Math.max(
    0,
    Math.round(
      (Date.parse(`${activeEnd}T00:00:00Z`) -
        Date.parse(`${activeStart}T00:00:00Z`)) / 86_400_000
    ) + 1
  )
  return Math.round((monthlyAmount * days) / monthDays(year, month))
}

assert.equal(prorata(31_000, "2025-01-10", null, 2025, 1), 22_000)
assert.equal(prorata(30_000, "2024-02-29", null, 2024, 2), 1_034)
assert.equal(prorata(31_000, "2025-01-01", "2025-01-31", 2025, 1), 31_000)
assert.equal(prorata(31_000, "2025-02-01", "2025-02-28", 2025, 1), 0)

console.log("Lease billing prorata checks passed")
