import { DataTable } from "@/components/ui/data-table"
import { moduleIndex } from "@/data/module"
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
  const result = await moduleIndex(currentPage, size, query)

  const { data, meta } = result

  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function ModulePage({
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
        <h2 className="mb-4 text-3xl font-bold">Module</h2>

        <Link href="/setup-aplikasi/module/new" className={buttonVariants()}>
          Add New
        </Link>
      </div>

      <SearchBox />

      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
