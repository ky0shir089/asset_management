"use client"

import type { assetTransferIndexType } from "@/data/asset-transfer"
import type { ColumnDef } from "@tanstack/react-table"

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
        className={
          row.original.status === "PENDING"
            ? "font-medium text-amber-700 dark:text-amber-300"
            : "font-medium text-emerald-700 dark:text-emerald-300"
        }
      >
        {row.original.status}
      </span>
    ),
  },
]
