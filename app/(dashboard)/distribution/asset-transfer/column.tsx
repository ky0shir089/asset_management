"use client"

import type { assetTransferIndexType } from "@/data/asset-transfer"
import type { ColumnDef } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Eye } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

const statusClasses: Record<string, string> = {
  PENDING: "font-medium text-amber-700 dark:text-amber-300",
  RECEIVED: "font-medium text-emerald-700 dark:text-emerald-300",
}

export const columns: ColumnDef<assetTransferIndexType>[] = [
  { header: "Transfer Date", accessorKey: "transferDate" },
  {
    header: "Asset",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.assetNumber}</p>
        <p className="text-sm text-muted-foreground">
          {row.original.assetCode} - {row.original.assetName}
        </p>
      </div>
    ),
  },
  {
    header: "Company",
    cell: ({ row }) =>
      `${row.original.companyCode} - ${row.original.companyName}`,
  },
  { header: "Destination", accessorKey: "outletName" },
  { header: "Assigned User", accessorKey: "userName" },
  {
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          statusClasses[row.original.status] ?? "font-medium text-muted-foreground"
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    header: "Actions",
    id: "actions",
    cell: ({ row }) => (
      <Link
        href={`/distribution/asset-transfer/${row.original.id}`}
        aria-label={`View transfer ${row.original.id}`}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
]
