"use client"

import { buttonVariants } from "@/components/ui/button"
import type { purchaseRequestIndexType } from "@/data/purchase-request"
import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<purchaseRequestIndexType>[] = [
  {
    header: "PR No",
    accessorKey: "prNo",
  },
  {
    header: "Date",
    accessorKey: "date",
  },
  {
    header: "Company",
    accessorFn: (row) => row.company.code,
  },
  {
    header: "Category",
    accessorFn: (row) => row.assetCategory.name,
  },
  {
    header: "Description",
    accessorKey: "description",
  },
  {
    header: "Qty",
    accessorKey: "totalQuantity",
  },
  {
    header: "Amount",
    accessorKey: "totalAmount",
    cell: ({ row }) => (row.original.totalAmount ?? 0).toLocaleString("id-ID"),
  },
  {
    header: "Status",
    accessorKey: "status",
  },
  {
    header: "Action",
    cell: ({ row }) => {
      return (
        <Link
          className={buttonVariants({ variant: "link", size: "sm" })}
          href={`/asset-transaction/list-purchase-request/${row.original.id}`}
        >
          <Eye data-icon="inline-start" />
          View
        </Link>
      )
    },
  },
]
