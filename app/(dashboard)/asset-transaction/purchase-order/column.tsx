"use client"

import { buttonVariants } from "@/components/ui/button"
import type { purchaseOrderIndexType } from "@/data/purchase-order"
import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<purchaseOrderIndexType>[] = [
  {
    header: "Date",
    accessorKey: "date",
  },
  {
    header: "PO No",
    accessorKey: "poNo",
  },
  {
    header: "PR No",
    accessorFn: (row) => row.purchaseRequest.prNo,
  },
  {
    header: "Supplier",
    accessorFn: (row) => row.supplier.name,
  },
  {
    header: "Description",
    accessorKey: "description",
  },
  {
    header: "Total Quantity",
    accessorKey: "totalQuantity",
    cell: ({ row }) => <div className="text-center">{row.original.totalQuantity}</div>,
  },
  {
    header: "Total Amount",
    accessorKey: "totalAmount",
    cell: ({ row }) => <div className="text-right">{(row.original.totalAmount ?? 0).toLocaleString("id-ID")}</div>,
  },
  {
    header: "Shipping",
    accessorKey: "shippingCost",
    cell: ({ row }) => <div className="text-right">{(row.original.shippingCost ?? 0).toLocaleString("id-ID")}</div>,
  },
  {
    header: "Total Cost",
    accessorKey: "totalCost",
    cell: ({ row }) => <div className="text-right">{(row.original.totalCost ?? 0).toLocaleString("id-ID")}</div>,
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
          href={`/asset-transaction/purchase-order/${row.original.id}`}
        >
          <Eye data-icon="inline-start" />
          View
        </Link>
      )
    },
  },
]
