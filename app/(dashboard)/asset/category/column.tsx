"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { assetCategoryIndexType } from "@/data/asset-category"

export const columns: ColumnDef<assetCategoryIndexType>[] = [
  {
    header: "Name",
    accessorKey: "name",
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset/category/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
