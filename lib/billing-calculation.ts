export type BillingPeriod = {
  start: string
  end: string
  days: number
}

export type BillingLineInput = {
  rate: number
  dateStart: string
  dateEnd: string | null
}

export function billingPeriod(year: number, month: number): BillingPeriod {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Invalid billing year")
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid billing month")
  }

  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const part = String(month).padStart(2, "0")
  return {
    start: `${year}-${part}-01`,
    end: `${year}-${part}-${String(days).padStart(2, "0")}`,
    days,
  }
}

export function prorataRent(
  { rate, dateStart, dateEnd }: BillingLineInput,
  period: BillingPeriod
) {
  if (!Number.isSafeInteger(rate) || rate < 0) {
    throw new Error("Rent rate must be a non-negative integer")
  }

  const start = dateStart > period.start ? dateStart : period.start
  const end = dateEnd && dateEnd < period.end ? dateEnd : period.end
  if (start > end) return 0

  const activeDays =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000 +
    1
  return Math.round((rate * activeDays) / period.days)
}

export function invoiceTotals(input: {
  rent: number
  charges: number
  vatRate: number
  withholdingRate: number
  depositDeduction: number
}) {
  const base = input.rent + input.charges
  const vat = Math.round((base * input.vatRate) / 10_000)
  const withholding = Math.round((base * input.withholdingRate) / 10_000)
  const gross = base + vat
  const depositDeduction = Math.min(input.depositDeduction, gross)
  const total = gross - withholding - depositDeduction
  return { base, vat, withholding, depositDeduction, total }
}

export function paymentStatus(total: number, paid: number) {
  if (paid >= total) return "PAID" as const
  if (paid > 0) return "PARTIALLY_PAID" as const
  return "ISSUED" as const
}

function demo() {
  const february = billingPeriod(2024, 2)
  console.assert(february.days === 29)
  console.assert(
    prorataRent(
      { rate: 30_000, dateStart: "2024-02-10", dateEnd: null },
      february
    ) === 20_690
  )
  const totals = invoiceTotals({
    rent: 100_000,
    charges: 10_000,
    vatRate: 1_100,
    withholdingRate: 230,
    depositDeduction: 5_000,
  })
  console.assert(
    totals.total === totals.base + totals.vat - totals.withholding - 5_000
  )
  console.assert(paymentStatus(100, 30) === "PARTIALLY_PAID")
  console.assert(paymentStatus(100, 100) === "PAID")
}

demo()
