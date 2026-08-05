import { DataTableSkeleton } from "@/components/data-table-skeleton"
import SearchBox from "@/components/search-box"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { assetTransferIndex } from "@/data/asset-transfer"
import { getSearchParam, type SearchParamValue } from "@/lib/helper"
import Link from "next/link"
import { Suspense } from "react"
import { columns } from "./column"

const RenderTable = async ({
  currentPage,
  size,
  query,
}: {
  currentPage: number
  size: number
  query?: string
}) => {
  const { data, meta } = await assetTransferIndex(currentPage, size, query)

  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function AssetTransferPage({
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
        <h1 className="text-3xl font-bold">Asset Transfer</h1>
        <Link href="/distribution/asset-transfer/new" className={buttonVariants()}>
          Add New
        </Link>
      </div>

      <SearchBox />

      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={6} />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
