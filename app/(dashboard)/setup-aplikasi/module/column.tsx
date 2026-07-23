"use client"

import { buttonVariants } from "@/components/ui/button"
import { moduleShowType } from "@/data/module"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<moduleShowType>[] = [
  {
    header: "ID",
    accessorKey: "id",
  },
  {
    header: "Title",
    accessorKey: "name",
  },
  {
    header: "Icon",
    accessorKey: "icon",
  },
  {
    header: "Position",
    accessorKey: "position",
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/setup-aplikasi/module/${row.original.id}/edit`}
      >
        <ClipboardEdit />
        Edit
      </Link>
    ),
  },
]
