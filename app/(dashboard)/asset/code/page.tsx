import { DataTableSkeleton } from "@/components/data-table-skeleton"
import SearchBox from "@/components/search-box"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { assetCodeIndex } from "@/data/asset-code"
import Link from "next/link"
import { Suspense } from "react"
import { columns } from "./column"

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
  const result = await assetCodeIndex(currentPage, size, query)

  const { data, meta } = result

  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function AssetCodePage({
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="mb-4 text-3xl font-bold">Asset Code</h2>

        <Link href="/asset/code/new" className={buttonVariants()}>
          Add New
        </Link>
      </div>

      <SearchBox />

      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={4} />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
