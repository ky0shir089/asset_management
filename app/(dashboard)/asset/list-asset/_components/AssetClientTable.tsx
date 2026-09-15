"use client"

import type { listAssetsIndexType } from "@/data/received-asset"
import type { PaginationMeta } from "@/lib/helper"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "../column"

export default function AssetClientTable({
  data,
  meta,
  showSensitiveFields,
}: {
  data: listAssetsIndexType[]
  meta?: PaginationMeta
  showSensitiveFields: boolean
}) {
  const columns = getColumns(showSensitiveFields)
  return <DataTable columns={columns} data={data} meta={meta} />
}
