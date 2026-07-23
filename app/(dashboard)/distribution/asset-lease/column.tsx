"use client"

import { buttonVariants } from "@/components/ui/button"
import type { assetLeaseIndexType } from "@/data/asset-lease"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

const createdAtFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

export const columns: ColumnDef<assetLeaseIndexType>[] = [
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
    header: "Created At",
    accessorKey: "createdAt",
    cell: ({ row }) => createdAtFormatter.format(row.original.createdAt),
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
