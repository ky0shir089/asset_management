"use client"

import { buttonVariants } from "@/components/ui/button"
import type { purchaseRequestIndexType } from "@/data/purchase-request"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit, Eye } from "lucide-react"
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
    cell: ({ row }) => row.original.company?.code ?? "-",
  },
  {
    header: "Category",
    cell: ({ row }) => row.original.assetCategory?.name ?? "-",
  },
  {
    header: "Description",
    accessorKey: "description",
    cell: ({ row }) => row.original.description ?? "-",
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
      return row.original.status === "REQUEST" ? (
        <Link
          className={buttonVariants({ variant: "link", size: "sm" })}
          href={`/asset-transaction/purchase-request/${row.original.id}/edit`}
        >
          <ClipboardEdit data-icon="inline-start" />
          Edit
        </Link>
      ) : (
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
