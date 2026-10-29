import { DataTableSkeleton } from "@/components/data-table-skeleton"
import SearchBox from "@/components/search-box"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { rentInvoiceIndex } from "@/data/rent-billing"
import { getSearchParam, type SearchParamValue } from "@/lib/helper"
import Link from "next/link"
import { Suspense } from "react"
import { columns } from "./column"

async function InvoiceTable({
  currentPage,
  size,
  query,
}: {
  currentPage: number
  size: number
  query: string
}) {
  const result = await rentInvoiceIndex(currentPage, size, query)
  return <DataTable columns={columns} data={result.data} meta={result.meta} />
}

export default async function RentBillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: SearchParamValue
    size?: SearchParamValue
    q?: SearchParamValue
  }>
}) {
  const params = await searchParams
  const currentPage = Number(getSearchParam(params.page) ?? 1)
  const size = Number(getSearchParam(params.size) ?? 10)
  const query = getSearchParam(params.q) ?? ""

  return (
    <main className="w-full space-y-4" aria-labelledby="rent-billing-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1
            id="rent-billing-title"
            className="text-2xl font-semibold tracking-tight"
          >
            Rent Invoices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly lease billing, invoice status, and payments.
          </p>
        </div>
        <Link
          href="/asset-transaction/rent-billing/new"
          className={buttonVariants()}
        >
          Create invoice
        </Link>
      </header>
      <SearchBox />
      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={7} />}
      >
        <InvoiceTable currentPage={currentPage} size={size} query={query} />
      </Suspense>
    </main>
  )
}
