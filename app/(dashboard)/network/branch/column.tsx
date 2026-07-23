"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { branchIndexType } from "@/data/branch"

export const columns: ColumnDef<branchIndexType>[] = [
  {
    header: "ID",
    accessorKey: "id",
  },
  {
    header: "Company",
    accessorFn: (row) => row.company.name,
  },
  {
    header: "Branch ID",
    accessorKey: "branchId",
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
        href={`/network/branch/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
