"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { outletIndexType } from "@/data/outlet"

export const columns: ColumnDef<outletIndexType>[] = [
  {
    header: "ID",
    accessorKey: "id",
  },
  {
    header: "Company",
    accessorFn: (row) => row.branch.company.code,
  },
  {
    header: "Branch ID",
    accessorFn: (row) => row.branch.branchId,
  },
  {
    header: "Branch",
    accessorFn: (row) => row.branch.name,
  },
  {
    header: "Outlet ID",
    accessorKey: "outletId",
  },
  {
    header: "Name",
    accessorKey: "name",
  },
  {
    header: "Status",
    cell: ({ row }) => (row.original.isActive ? "Active" : "Inactive"),
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/network/outlet/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
