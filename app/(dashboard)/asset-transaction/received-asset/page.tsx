import { DataTable } from "@/components/ui/data-table"
import { receivedAssetIndex } from "@/data/received-asset"
import { columns } from "./column"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Suspense } from "react"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import SearchBox from "@/components/search-box"

import { getSearchParam, type SearchParamValue } from "@/lib/helper"

const RenderTable = async ({
  currentPage,
  size,
  query,
}: {
  currentPage: number
  size: number
  query?: string
}) => {
  const result = await receivedAssetIndex(currentPage, size, query)
  const { data, meta } = result

  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function ReceivedAssetPage({
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
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="mb-4 text-3xl font-bold">Received Asset</h2>

        <Link
          href="/asset-transaction/received-asset/new"
          className={buttonVariants()}
        >
          Add New
        </Link>
      </div>

      <SearchBox />

      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={7} />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
