"use client"

import type { listAssetsIndexType } from "@/data/received-asset"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Eye } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import MaintenanceModal from "./_components/MaintenanceModal"

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function getColumns(
  showSensitiveFields: boolean = true
): ColumnDef<listAssetsIndexType>[] {
  const cols: ColumnDef<listAssetsIndexType>[] = [
    {
      header: "Nomor Asset",
      accessorKey: "assetNumber",
    },
    {
      header: "Category",
      accessorKey: "categoryName",
    },
    {
      header: "Asset Code",
      accessorKey: "assetCodeName",
    },
    {
      header: "Asset Location",
      accessorKey: "outletName",
    },
  ]

  if (showSensitiveFields) {
    cols.push({
      header: "Harga Beli",
      accessorKey: "purchasePrice",
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.purchasePrice != null
            ? priceFormatter.format(row.original.purchasePrice)
            : "-"}
        </span>
      ),
    })
  }

  cols.push({
    header: "User",
    accessorFn: (row) => row.recipientName ?? "-",
  })

  if (showSensitiveFields) {
    cols.push({
      header: "Status",
      accessorKey: "status",
    })
  }

  cols.push({
    id: "actions",
    header: "Aksi",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/asset/list-asset/${row.original.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Eye className="mr-1 h-3.5 w-3.5" />
          Detail
        </Link>
        <MaintenanceModal asset={row.original} />
      </div>
    ),
  })

  return cols
}

export const columns = getColumns(true)
