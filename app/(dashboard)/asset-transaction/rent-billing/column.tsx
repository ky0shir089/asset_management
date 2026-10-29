"use client"

import { buttonVariants } from "@/components/ui/button"
import type { rentInvoiceIndexType } from "@/data/rent-billing"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
const date = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
})

function statusLabel(status: string) {
  return (
    (
      {
        DRAFT: "Draft",
        ISSUED: "Issued",
        OVERDUE: "Overdue",
        PARTIALLY_PAID: "Partially paid",
        PAID: "Paid",
        CANCELLED: "Cancelled",
      } as Record<string, string>
    )[status] ?? status
  )
}

export const columns: ColumnDef<rentInvoiceIndexType>[] = [
  {
    header: "Invoice",
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">
        {row.original.invoiceNo ?? `Draft · ${row.original.id}`}
      </div>
    ),
  },
  { header: "Company", accessorKey: "companyName" },
  {
    header: "Period",
    cell: ({ row }) =>
      date.format(new Date(`${row.original.periodStart}T00:00:00Z`)),
  },
  {
    header: "Due date",
    accessorKey: "dueDate",
    cell: ({ row }) =>
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${row.original.dueDate}T00:00:00Z`)),
  },
  {
    header: "Total",
    accessorKey: "total",
    cell: ({ row }) => (
      <span className="tabular-nums">{money.format(row.original.total)}</span>
    ),
  },
  {
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">
        {statusLabel(row.original.paymentStatus)}
      </span>
    ),
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset-transaction/rent-billing/${row.original.id}`}
      >
        <Eye data-icon="inline-start" />
        View
      </Link>
    ),
  },
]
