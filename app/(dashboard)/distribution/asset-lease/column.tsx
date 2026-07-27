"use client"

import { buttonVariants } from "@/components/ui/button"
import type { assetLeaseIndexType } from "@/data/asset-lease"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<assetLeaseIndexType>[] = [
  {
    header: "Rent Date",
    accessorKey: "rentDate",
  },
  {
    header: "Rent No",
    accessorKey: "rentNo",
  },
  {
    header: "Outlet",
    accessorFn: (row) => row.outlet?.name ?? "-",
  },
  {
    header: "Note",
    accessorKey: "note",
    cell: ({ row }) => row.original.note ?? "-",
  },
  { header: "Status", accessorKey: "status" },
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
