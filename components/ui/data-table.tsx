"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { PaginationMeta } from "@/lib/helper"
import { DataTablePagination } from "../data-table-pagination"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta?: PaginationMeta
}

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
}: DataTableProps<TData, TValue>) {
  const pathname = usePathname()
  const { replace } = useRouter()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("size")) || 10
  const pageIndex = currentPage - 1

  const createPageURL = (
    pageNumber: number | string,
    size: number | string
  ) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    params.set("size", size.toString())
    replace(`${pathname}?${params.toString()}`)
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: (updater) => {
      const currentPagination = { pageIndex, pageSize }
      const newPagination =
        typeof updater === "function" ? updater(currentPagination) : updater

      createPageURL(newPagination.pageIndex + 1, newPagination.pageSize)
    },
    manualPagination: true,
    pageCount: meta?.last_page,
    rowCount: data.length,
    state: {
      pagination: { pageIndex, pageSize },
    },
  })

  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <DataTablePagination
          table={table}
          meta={meta}
          createPageURL={createPageURL}
        />
      )}
    </>
  )
}
