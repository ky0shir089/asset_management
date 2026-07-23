"use client"

import { buttonVariants } from "@/components/ui/button"
import type { assetSpecIndexType } from "@/data/asset-spec"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<assetSpecIndexType>[] = [
  {
    header: "Code",
    accessorFn: (row) => row.code.code,
  },
  {
    header: "Asset",
    accessorFn: (row) => row.code.name,
  },
  {
    header: "Specification",
    accessorKey: "name",
  },
  {
    header: "Type",
    cell: ({ row }) => (row.original.type === "SELECT" ? "Select" : "Text"),
  },
  {
    header: "Required",
    cell: ({ row }) => (row.original.isRequired ? "Yes" : "No"),
  },
  {
    header: "Createable",
    cell: ({ row }) => (row.original.createable ? "Yes" : "No"),
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset/specification/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
