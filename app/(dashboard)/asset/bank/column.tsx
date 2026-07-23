"use client"

import { buttonVariants } from "@/components/ui/button"
import type { bankIndexType } from "@/data/bank"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<bankIndexType>[] = [
  {
    header: "Name",
    accessorKey: "name",
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset/bank/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
