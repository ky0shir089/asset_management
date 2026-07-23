"use client"

import { buttonVariants } from "@/components/ui/button"
import { roleIndexType } from "@/data/role"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<roleIndexType>[] = [
  {
    header: "ID",
    accessorKey: "id",
  },
  {
    header: "Role",
    accessorKey: "name",
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/setup-aplikasi/role/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
