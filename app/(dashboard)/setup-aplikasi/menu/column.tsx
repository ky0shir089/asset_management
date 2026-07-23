"use client"

import { buttonVariants } from "@/components/ui/button"
import { menuShowType } from "@/data/menu"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<menuShowType>[] = [
  {
    header: "ID",
    accessorKey: "id",
  },
  {
    header: "Module",
    accessorKey: "moduleName",
  },
  {
    header: "Name",
    accessorKey: "name",
  },
  {
    header: "Path",
    accessorKey: "path",
  },
  {
    header: "Key",
    accessorKey: "key",
  },
  {
    header: "Position",
    accessorKey: "position",
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
        href={`/setup-aplikasi/menu/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
