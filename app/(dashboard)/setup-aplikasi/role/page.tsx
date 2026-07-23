import SearchBox from "@/components/search-box"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { roleIndex } from "@/data/role"
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
  const result = await roleIndex(currentPage, size, query)

  const { data, meta } = result

  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function RolePage({
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
        <h2 className="mb-4 text-3xl font-bold">Role</h2>

        <Link href="/setup-aplikasi/role/new" className={buttonVariants()}>
          Add New
        </Link>
      </div>

      <SearchBox />

      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={5} />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
