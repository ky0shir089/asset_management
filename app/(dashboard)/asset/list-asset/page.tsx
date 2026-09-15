import { listAssetsIndex, type ListAssetsFilters } from "@/data/received-asset"
import AssetClientTable from "./_components/AssetClientTable"
import { Suspense } from "react"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import AssetListFilters from "./_components/AssetListFilters"

import { getSearchParam, type SearchParamValue } from "@/lib/helper"
import { requireUser } from "@/data/require-user"

const RenderTable = async ({
  currentPage,
  size,
  filters,
  showSensitiveFields,
}: {
  currentPage: number
  size: number
  filters: ListAssetsFilters
  showSensitiveFields: boolean
}) => {
  const result = await listAssetsIndex(currentPage, size, filters)
  const { data, meta } = result

  return (
    <AssetClientTable
      data={data}
      meta={meta}
      showSensitiveFields={showSensitiveFields}
    />
  )
}

export default async function ListAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: SearchParamValue
    size?: SearchParamValue
    nomorAsset?: SearchParamValue
    assetCode?: SearchParamValue
    location?: SearchParamValue
    user?: SearchParamValue
    status?: SearchParamValue
  }>
}) {
  const user = await requireUser()
  const showSensitiveFields =
    user.role === "Super Administrator" ||
    user.role === "Admin GA" ||
    user.role === "Admin IT"

  const params = await searchParams
  const currentPage = Number(getSearchParam(params.page) ?? 1)
  const size = Number(getSearchParam(params.size) ?? 10)

  const filters: ListAssetsFilters = {
    nomorAsset: getSearchParam(params.nomorAsset),
    assetCode: getSearchParam(params.assetCode),
    location: getSearchParam(params.location),
    user: getSearchParam(params.user),
    status: getSearchParam(params.status),
  }

  const suspenseKey = `${currentPage}-${size}-${filters.nomorAsset}-${filters.assetCode}-${filters.location}-${filters.user}-${filters.status}`

  return (
    <>
      <h2 className="mb-4 text-3xl font-bold">List Assets</h2>

      <AssetListFilters />

      <Suspense key={suspenseKey} fallback={<DataTableSkeleton columns={showSensitiveFields ? 8 : 6} />}>
        <RenderTable
          currentPage={currentPage}
          size={size}
          filters={filters}
          showSensitiveFields={showSensitiveFields}
        />
      </Suspense>
    </>
  )
}
