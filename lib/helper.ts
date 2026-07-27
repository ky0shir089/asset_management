export interface PaginationParams {
  page: number
  pageSize: number
  offset: number
}

export interface PaginationMeta {
  from: number
  last_page: number
  to: number
  total: number
}

export interface PaginatedResponse<TData> {
  data: TData[]
  meta: PaginationMeta
}

export type SearchParamValue = string | string[] | undefined

export function getSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

function safePositiveInteger(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(Math.trunc(value), 1) : fallback
}

function safeNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(Math.trunc(value), 0) : 0
}

export function paginationParams(
  page: number = 1,
  pageSize: number = 10,
  maxPageSize: number = 100
): PaginationParams {
  const safePage = safePositiveInteger(Number(page), 1)
  const safeMaxPageSize = safePositiveInteger(Number(maxPageSize), 100)
  const safePageSize = Math.min(
    safePositiveInteger(Number(pageSize), 10),
    safeMaxPageSize
  )

  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
  }
}

export function paginationMeta(
  pagination: PaginationParams,
  total: number,
  itemCount: number
): PaginationMeta {
  const safeTotal = safeNonNegativeInteger(Number(total))
  const safeItemCount = safeNonNegativeInteger(Number(itemCount))
  const lastPage = Math.max(Math.ceil(safeTotal / pagination.pageSize), 1)

  return {
    from: safeTotal === 0 ? 0 : pagination.offset + 1,
    last_page: lastPage,
    to: Math.min(pagination.offset + safeItemCount, safeTotal),
    total: safeTotal,
  }
}

export function paginatedResponse<TData>(
  data: TData[],
  total: number,
  pagination: PaginationParams
): PaginatedResponse<TData> {
  return {
    data,
    meta: paginationMeta(pagination, total, data.length),
  }
}
