"use client"

import { buttonVariants } from "@/components/ui/button"
import type { supplierIndexType } from "@/data/supplier"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export const columns: ColumnDef<supplierIndexType>[] = [
  {
    header: "Name",
    accessorKey: "name",
  },
  {
    header: "Banks",
    cell: ({ row }) => {
      const banks = uniqueValues(row.original.accounts.map((item) => item.bank.name))

      return banks.length ? banks.join(", ") : "-"
    },
  },
  {
    header: "Accounts",
    cell: ({ row }) => {
      const accounts = row.original.accounts.map((item) => item.accountNo)

      return accounts.length ? accounts.join(", ") : "-"
    },
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset/supplier/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
