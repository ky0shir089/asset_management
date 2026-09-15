"use client"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { receivedAssetIndexType } from "@/data/received-asset"
import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<receivedAssetIndexType>[] = [
  {
    header: "Asset Number",
    accessorKey: "nomorAssets",
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        <span>{row.original.nomorAssets}</span>
        {row.original.photos.length === 0 && (
          <Badge variant="outline">No photos</Badge>
        )}
      </div>
    ),
  },
  {
    header: "Company",
    accessorFn: (row) =>
      row.poDetail?.purchaseOrder?.purchaseRequest?.company?.code ?? "-",
  },
  {
    header: "Asset Code",
    accessorFn: (row) => row.poDetail?.prDetail?.assetCode?.code ?? "-",
  },
  {
    header: "Asset Name",
    accessorFn: (row) => row.poDetail?.prDetail?.assetCode?.name ?? "-",
  },
  {
    header: "Outlet",
    accessorFn: (row) => row.outlet?.name ?? "-",
  },
  {
    header: "Condition",
    accessorKey: "condition",
  },
  {
    header: "Status",
    accessorKey: "status",
  },
  {
    header: "Action",
    cell: ({ row }) => {
      return (
        <Link
          className={buttonVariants({ variant: "link", size: "sm" })}
          href={`/asset-transaction/received-asset/${row.original.id}`}
        >
          <Eye data-icon="inline-start" />
          View
        </Link>
      )
    },
  },
]
