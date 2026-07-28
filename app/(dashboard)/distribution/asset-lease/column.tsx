"use client"

import { buttonVariants } from "@/components/ui/button"
import type { assetLeaseIndexType } from "@/data/asset-lease"
import AssetLeaseStatusBadge from "./_components/AssetLeaseStatusBadge"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<assetLeaseIndexType>[] = [
  { header: "Lease Date", accessorKey: "rentDate" },
  { header: "Lease No", accessorKey: "rentNo" },
  {
    header: "Company",
    accessorFn: (row) => row.company?.name ?? "-",
  },
  {
    header: "Receive Date",
    accessorKey: "receiveDate",
    cell: ({ row }) => row.original.receiveDate ?? "-",
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <AssetLeaseStatusBadge status={row.original.status} />,
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/distribution/asset-lease/${row.original.id}`}
      >
        <Eye data-icon="inline-start" />
        View
      </Link>
    ),
  },
]
