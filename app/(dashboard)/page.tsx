import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDashboardData, type DashboardFilterInput } from "@/data/dashboard"
import { getSearchParam, type SearchParamValue } from "@/lib/helper"
import {
  Archive,
  ArrowRight,
  BellRing,
  Box,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  CircleCheckBig,
  Filter,
  RotateCcw,
  ClipboardList,
  Clock3,
  KeyRound,
  Package,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

const numberFormatter = new Intl.NumberFormat("id-ID")
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const percentageFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
})
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(2000, index, 1)
  ),
}))

type DashboardSearchParams = Partial<
  Record<keyof DashboardFilterInput, SearchParamValue>
>

type ChartSegment = {
  label: string
  count: number
  color: string
  stroke: string
}

type MetricCardProps = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  rail: string
  accent: string
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

function formatShare(count: number, total: number) {
  return percentageFormatter.format(total ? (count / total) * 100 : 0)
}

function DashboardFilterSelect({
  id,
  name,
  label,
  value,
  options,
}: {
  id: string
  name: keyof DashboardFilterInput
  label: string
  value?: string | number
  options: { value: string; label: string }[]
}) {
  const allLabel = `All ${label.toLowerCase()}`

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        key={`${name}-${value ?? "all"}`}
        name={name}
        items={[{ value: null, label: allLabel }, ...options]}
        defaultValue={value === undefined ? null : String(value)}
        disabled={options.length === 0}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={options.length ? allLabel : "No options"} />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            <SelectItem value={null}>{allLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  rail,
  accent,
}: MetricCardProps) {
  return (
    <Card size="sm" className="relative min-w-0 gap-2 py-3">
      <span className={`absolute inset-x-0 top-0 h-1 ${rail}`} />
      <CardContent className="flex items-start gap-3 pt-1">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.68rem] leading-tight font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 text-xl leading-none font-bold tracking-tight wrap-break-word sm:text-2xl">
            {value}
          </p>
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DonutGraphic({
  segments,
  total,
  centerValue,
  centerLabel,
}: {
  segments: ChartSegment[]
  total: number
  centerValue: string
  centerLabel: string
}) {
  const visibleSegments = segments
    .filter((segment) => segment.count > 0)
    .map((segment, index, visible) => ({
      ...segment,
      share: total ? (segment.count / total) * 100 : 0,
      offset: visible
        .slice(0, index)
        .reduce(
          (sum, item) => sum + (total ? (item.count / total) * 100 : 0),
          0
        ),
    }))

  return (
    <div className="relative mx-auto size-40 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="size-full -rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx="60"
          cy="60"
          r="45"
          pathLength="100"
          fill="none"
          className="stroke-muted"
          strokeWidth="14"
        />
        {visibleSegments.map((segment) => (
          <circle
            key={segment.label}
            cx="60"
            cy="60"
            r="45"
            pathLength="100"
            fill="none"
            strokeWidth="14"
            strokeLinecap="butt"
            className={segment.stroke}
            strokeDasharray={`${segment.share} ${100 - segment.share}`}
            strokeDashoffset={-segment.offset}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="text-2xl leading-none tracking-tight">
          {centerValue}
        </strong>
        <span className="mt-1 max-w-20 text-xs leading-tight text-muted-foreground">
          {centerLabel}
        </span>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>
}) {
  const params = await searchParams
  const data = await getDashboardData({
    year: getSearchParam(params.year),
    month: getSearchParam(params.month),
    companyId: getSearchParam(params.companyId),
    branchId: getSearchParam(params.branchId),
    outletId: getSearchParam(params.outletId),
    assetCodeId: getSearchParam(params.assetCodeId),
    assetStatus: getSearchParam(params.assetStatus),
  })
  const inventoryTotal = data.inventory?.total ?? 0
  const pendingTotal =
    data.workflow.pendingReceipts +
    (data.workflow.purchaseRequests ?? 0) +
    (data.workflow.assetLeases ?? 0)
  const inventorySegments: ChartSegment[] = data.inventory
    ? [
        {
          label: "Available",
          count: data.inventory.available,
          color: "bg-chart-1",
          stroke: "stroke-chart-1",
        },
        {
          label: "Booked",
          count: data.inventory.booked,
          color: "bg-chart-2",
          stroke: "stroke-chart-2",
        },
        {
          label: "Leased",
          count: data.inventory.leased,
          color: "bg-chart-3",
          stroke: "stroke-chart-3",
        },
        {
          label: "Other",
          count: data.inventory.other,
          color: "bg-chart-4",
          stroke: "stroke-chart-4",
        },
      ]
    : []
  const workflowItems = [
    {
      label: "Transfer receipts",
      description: "Assigned assets awaiting confirmation",
      count: data.workflow.pendingReceipts,
      href: "/distribution/asset-transfer-receipts",
      icon: Truck,
      color: "bg-chart-1",
      stroke: "stroke-chart-1",
      accent: "bg-chart-1/10",
    },
    ...(data.workflow.purchaseRequests === null
      ? []
      : [
          {
            label: "Purchase requests",
            description: "Requests awaiting decision",
            count: data.workflow.purchaseRequests,
            href: "/asset-transaction/list-purchase-request",
            icon: ClipboardList,
            color: "bg-chart-2",
            stroke: "stroke-chart-2",
            accent: "bg-chart-2/10",
          },
        ]),
    ...(data.workflow.assetLeases === null
      ? []
      : [
          {
            label: "Asset leases",
            description: "Lease requests awaiting decision",
            count: data.workflow.assetLeases,
            href: "/distribution/asset-lease",
            icon: Clock3,
            color: "bg-chart-3",
            stroke: "stroke-chart-3",
            accent: "bg-chart-3/10",
          },
        ]),
  ]
  const pendingWorkflowItems = workflowItems.filter((item) => item.count > 0)
  const procurementItems = [
    ...(data.purchaseRequests
      ? [
          {
            label: "Requested units",
            recordsLabel: "Purchase requests",
            records: data.purchaseRequests.records,
            units: data.purchaseRequests.units,
            amountLabel: "Recorded amount",
            amount: data.purchaseRequests.amount,
            color: "bg-chart-1",
            icon: ClipboardList,
          },
        ]
      : []),
    ...(data.purchaseOrders
      ? [
          {
            label: "Ordered units",
            recordsLabel: "Purchase orders",
            records: data.purchaseOrders.records,
            units: data.purchaseOrders.units,
            amountLabel: data.filters.assetCodeId
              ? "Matching item amount"
              : "Recorded cost",
            amount: data.purchaseOrders.cost,
            color: "bg-chart-2",
            icon: Package,
          },
        ]
      : []),
  ]
  const maxProcurementUnits = Math.max(
    1,
    ...procurementItems.map((item) => item.units)
  )
  const sortedCompanies = data.locations
    ? [...data.locations].sort(
        (a, b) => b.assetCount - a.assetCount || a.name.localeCompare(b.name)
      )
    : []
  const topCompanies = sortedCompanies.slice(0, 6)
  const maxCompanyAssets = Math.max(
    1,
    ...topCompanies.map((company) => company.assetCount)
  )
  const hasRestrictedData =
    data.inventory ||
    data.purchaseRequests ||
    data.purchaseOrders ||
    data.recentMovements ||
    data.workflow.purchaseRequests !== null ||
    data.workflow.assetLeases !== null

  return (
    <div className="min-w-0 space-y-4">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current asset position and operational work requiring attention.
          </p>
        </div>
        <p className="w-fit rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {data.scopeLabel}
        </p>
      </header>

      <Card size="sm" className="relative overflow-hidden">
        <span
          className="absolute inset-y-0 left-0 w-1 bg-chart-1"
          aria-hidden="true"
        />
        <CardHeader className="border-b pl-5">
          <div>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <Filter className="size-4 text-chart-1" aria-hidden="true" />
                Filter dashboard
              </h2>
            </CardTitle>
            <CardDescription>
              Period follows each module&apos;s business date. Location and
              status apply where available.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pl-5">
          <form
            method="get"
            action="/"
            className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-12"
          >
            <div className="xl:col-span-1">
              <DashboardFilterSelect
                id="dashboard-filter-year"
                name="year"
                label="Year"
                value={data.filters.year}
                options={data.filterOptions.years.map((year) => ({
                  value: String(year),
                  label: String(year),
                }))}
              />
            </div>
            <div className="xl:col-span-1">
              <DashboardFilterSelect
                id="dashboard-filter-month"
                name="month"
                label="Month"
                value={data.filters.month}
                options={monthOptions}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <DashboardFilterSelect
                id="dashboard-filter-company"
                name="companyId"
                label="Company"
                value={data.filters.companyId}
                options={data.filterOptions.companies.map((company) => ({
                  value: company.id,
                  label: `${company.name} · ${company.code}`,
                }))}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <DashboardFilterSelect
                id="dashboard-filter-branch"
                name="branchId"
                label="Branch"
                value={data.filters.branchId}
                options={data.filterOptions.branches.map((branch) => ({
                  value: branch.id,
                  label: `${branch.name} · ${branch.companyName}`,
                }))}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <DashboardFilterSelect
                id="dashboard-filter-outlet"
                name="outletId"
                label="Outlet"
                value={data.filters.outletId}
                options={data.filterOptions.outlets.map((outlet) => ({
                  value: outlet.id,
                  label: `${outlet.name} · ${outlet.branchName}`,
                }))}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <DashboardFilterSelect
                id="dashboard-filter-asset-code"
                name="assetCodeId"
                label="Asset code"
                value={data.filters.assetCodeId}
                options={data.filterOptions.assetCodes.map((assetCode) => ({
                  value: assetCode.id,
                  label: `${assetCode.code} · ${assetCode.name}`,
                }))}
              />
            </div>
            <div className="xl:col-span-2">
              <DashboardFilterSelect
                id="dashboard-filter-status"
                name="assetStatus"
                label="Asset status"
                value={data.filters.assetStatus}
                options={data.filterOptions.statuses}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2 md:col-span-4 md:justify-end xl:col-span-12">
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                <RotateCcw aria-hidden="true" />
                Reset
              </Link>
              <Button type="submit">
                <Filter aria-hidden="true" />
                Apply filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!hasRestrictedData && data.workflow.pendingReceipts === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <Box
              className="mb-4 size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium">No dashboard modules available</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Dashboard sections follow permissions assigned to your current
              role.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {data.inventory && (
            <section
              className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
              aria-label="Asset overview"
            >
              <MetricCard
                label="Total assets"
                value={numberFormatter.format(data.inventory.total)}
                detail="Visible registered assets"
                icon={Boxes}
                rail="bg-chart-5"
                accent="bg-chart-5/10"
              />
              <MetricCard
                label="Available"
                value={numberFormatter.format(data.inventory.available)}
                detail={`${formatShare(data.inventory.available, inventoryTotal)}% of assets`}
                icon={CircleCheckBig}
                rail="bg-chart-1"
                accent="bg-chart-1/10"
              />
              <MetricCard
                label="Booked"
                value={numberFormatter.format(data.inventory.booked)}
                detail={`${formatShare(data.inventory.booked, inventoryTotal)}% of assets`}
                icon={CalendarClock}
                rail="bg-chart-2"
                accent="bg-chart-2/10"
              />
              <MetricCard
                label="Leased"
                value={numberFormatter.format(data.inventory.leased)}
                detail={`${formatShare(data.inventory.leased, inventoryTotal)}% of assets`}
                icon={KeyRound}
                rail="bg-chart-3"
                accent="bg-chart-3/10"
              />
              <MetricCard
                label="Other status"
                value={numberFormatter.format(data.inventory.other)}
                detail={`${formatShare(data.inventory.other, inventoryTotal)}% of assets`}
                icon={Archive}
                rail="bg-chart-4"
                accent="bg-chart-4/10"
              />
              <MetricCard
                label="Pending work"
                value={numberFormatter.format(pendingTotal)}
                detail="Visible assigned actions"
                icon={BellRing}
                rail="bg-chart-5"
                accent="bg-chart-5/10"
              />
            </section>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
            {data.inventory && (
              <Card size="sm" className="xl:col-span-4">
                <CardHeader className="border-b">
                  <div>
                    <CardTitle>
                      <h2 id="asset-status-title">Asset status</h2>
                    </CardTitle>
                    <CardDescription>
                      Current custody state of visible assets.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Boxes
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {inventoryTotal ? (
                    <figure
                      aria-labelledby="asset-status-title"
                      className="grid items-center gap-5 sm:grid-cols-[auto_1fr] xl:grid-cols-1 2xl:grid-cols-[auto_1fr]"
                    >
                      <DonutGraphic
                        segments={inventorySegments}
                        total={inventoryTotal}
                        centerValue={numberFormatter.format(inventoryTotal)}
                        centerLabel="Total assets"
                      />
                      <figcaption>
                        <ul className="space-y-2.5">
                          {inventorySegments.map((segment) => (
                            <li
                              key={segment.label}
                              className="grid grid-cols-[auto_1fr_auto] items-center gap-2"
                            >
                              <span
                                className={`size-2.5 rounded-sm ${segment.color}`}
                                aria-hidden="true"
                              />
                              <span className="text-sm">{segment.label}</span>
                              <span className="text-right text-sm tabular-nums">
                                <strong>
                                  {numberFormatter.format(segment.count)}
                                </strong>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {formatShare(segment.count, inventoryTotal)}%
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </figcaption>
                    </figure>
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center text-center">
                      <Boxes
                        className="mb-3 size-8 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="font-medium">No registered assets</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Assets appear here after receipt.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card
              size="sm"
              className={data.inventory ? "xl:col-span-4" : "xl:col-span-6"}
            >
              <CardHeader className="border-b">
                <div>
                  <CardTitle>
                    <h2 id="work-queue-title">Outstanding actions</h2>
                  </CardTitle>
                  <CardDescription>
                    Assigned approvals and receipts.
                  </CardDescription>
                </div>
                <CardAction>
                  <Clock3
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                {pendingWorkflowItems.length ? (
                  <figure aria-labelledby="work-queue-title">
                    {pendingWorkflowItems.length > 1 && (
                      <DonutGraphic
                        segments={pendingWorkflowItems}
                        total={pendingTotal}
                        centerValue={numberFormatter.format(pendingTotal)}
                        centerLabel="Pending"
                      />
                    )}
                    {pendingWorkflowItems.length === 1 && (
                      <div className="pb-3 text-center">
                        <p className="text-4xl font-bold tracking-tight">
                          {numberFormatter.format(pendingTotal)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pending action
                        </p>
                      </div>
                    )}
                    <figcaption>
                      <ul className="mt-4 space-y-2">
                        {pendingWorkflowItems.map((item) => {
                          const Icon = item.icon

                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="group flex min-h-14 items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                              >
                                <span
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-md ${item.accent}`}
                                >
                                  <Icon className="size-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium">
                                    {item.label}
                                  </span>
                                  <span className="block text-xs break-words whitespace-normal text-muted-foreground">
                                    {item.description}
                                  </span>
                                </span>
                                <strong className="text-lg">
                                  {numberFormatter.format(item.count)}
                                </strong>
                                <ArrowRight
                                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </figcaption>
                  </figure>
                ) : (
                  <div className="flex min-h-52 flex-col items-center justify-center text-center">
                    <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-chart-3/10">
                      <Check className="size-5" aria-hidden="true" />
                    </span>
                    <p className="font-medium">No pending work</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Assigned approvals and receipts are clear.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {procurementItems.length > 0 && (
              <Card
                size="sm"
                className={data.inventory ? "xl:col-span-4" : "xl:col-span-6"}
              >
                <CardHeader className="border-b">
                  <div>
                    <CardTitle>
                      <h2 id="procurement-title">Procurement volume</h2>
                    </CardTitle>
                    <CardDescription>
                      Stored demand and order totals.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <ShoppingCart
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {procurementItems.length > 1 && (
                    <figure
                      aria-labelledby="procurement-title"
                      className="mb-5 space-y-4"
                    >
                      {procurementItems.map((item) => (
                        <div key={item.label}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                            <span>{item.label}</span>
                            <strong className="tabular-nums">
                              {numberFormatter.format(item.units)}
                            </strong>
                          </div>
                          <div className="h-2.5 rounded-r-full bg-muted">
                            <div
                              className={`h-full rounded-r-full ${item.color}`}
                              style={{
                                width: `${(item.units / maxProcurementUnits) * 100}%`,
                              }}
                              title={`${item.label}: ${numberFormatter.format(item.units)}`}
                            />
                          </div>
                        </div>
                      ))}
                      <figcaption className="sr-only">
                        Requested and ordered unit totals on one shared scale.
                      </figcaption>
                    </figure>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {procurementItems.map((item) => {
                      const Icon = item.icon

                      return (
                        <section
                          key={item.recordsLabel}
                          className="rounded-lg border p-3"
                          aria-label={item.recordsLabel}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold">
                              {item.recordsLabel}
                            </h3>
                            <Icon
                              className="size-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                          <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Records</dt>
                              <dd className="font-semibold tabular-nums">
                                {numberFormatter.format(item.records)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Units</dt>
                              <dd className="font-semibold tabular-nums">
                                {numberFormatter.format(item.units)}
                              </dd>
                            </div>
                            <div className="border-t pt-2">
                              <dt className="text-xs text-muted-foreground">
                                {item.amountLabel}
                              </dt>
                              <dd className="mt-0.5 font-bold break-all tabular-nums">
                                {numberFormatter.format(item.amount)}
                              </dd>
                            </div>
                          </dl>
                        </section>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.locations &&
              (data.locations.length ? (
                <>
                  <Card size="sm" className="xl:col-span-5">
                    <CardHeader className="border-b">
                      <div>
                        <CardTitle>
                          <h2 id="company-distribution-title">
                            Assets by company
                          </h2>
                        </CardTitle>
                        <CardDescription>
                          Highest-volume companies in visible scope.
                        </CardDescription>
                      </div>
                      <CardAction>
                        <Building2
                          className="size-5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <figure aria-labelledby="company-distribution-title">
                        <div className="space-y-4">
                          {topCompanies.map((company) => (
                            <div key={company.id}>
                              <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">
                                    {company.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {company.code}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right tabular-nums">
                                  <strong>
                                    {numberFormatter.format(company.assetCount)}
                                  </strong>
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    {formatShare(
                                      company.assetCount,
                                      inventoryTotal
                                    )}
                                    %
                                  </span>
                                </span>
                              </div>
                              <div className="h-2.5 rounded-r-full bg-muted">
                                <div
                                  className="h-full rounded-r-full bg-chart-1"
                                  style={{
                                    width: `${(company.assetCount / maxCompanyAssets) * 100}%`,
                                  }}
                                  title={`${company.name}: ${numberFormatter.format(company.assetCount)} assets`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <figcaption className="mt-4 text-xs text-muted-foreground">
                          {sortedCompanies.length > topCompanies.length
                            ? `Showing top ${topCompanies.length} of ${sortedCompanies.length} companies. Complete location ledger shown beside this chart.`
                            : "Bars share one scale. Complete branch and outlet detail appears in location ledger."}
                        </figcaption>
                      </figure>
                    </CardContent>
                  </Card>

                  <Card size="sm" className="min-w-0 xl:col-span-7">
                    <CardHeader className="border-b">
                      <div>
                        <CardTitle>
                          <h2 id="location-ledger-title">Location ledger</h2>
                        </CardTitle>
                        <CardDescription>
                          Company, branch, and outlet assignment.
                        </CardDescription>
                      </div>
                      <CardAction>
                        <Building2
                          className="size-5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Pending transfers count at their assigned destination
                        before receipt confirmation.
                      </p>
                      <div
                        role="region"
                        aria-labelledby="location-ledger-title"
                        tabIndex={0}
                        className="max-h-[30rem] overflow-auto rounded-lg border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_[data-slot=table-container]]:overflow-visible"
                      >
                        <Table className="min-w-160">
                          <TableCaption className="sr-only">
                            Complete asset location hierarchy
                          </TableCaption>
                          <TableHeader className="sticky top-0 z-10 bg-card">
                            <TableRow>
                              <TableHead>Level</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Parent</TableHead>
                              <TableHead className="text-right">
                                Assets
                              </TableHead>
                              <TableHead className="text-right">
                                Share
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          {data.locations.map((company) => (
                            <TableBody key={company.id}>
                              <TableRow className="bg-muted/50 hover:bg-muted/60">
                                <TableCell className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                  Company
                                </TableCell>
                                <TableHead
                                  scope="row"
                                  className="h-auto font-semibold whitespace-normal"
                                >
                                  {company.name}
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    {company.code}
                                  </span>
                                </TableHead>
                                <TableCell>—</TableCell>
                                <TableCell className="text-right font-bold tabular-nums">
                                  {numberFormatter.format(company.assetCount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatShare(
                                    company.assetCount,
                                    inventoryTotal
                                  )}
                                  %
                                </TableCell>
                              </TableRow>
                              {company.branches.map((branch) => [
                                <TableRow key={`branch-${branch.id}`}>
                                  <TableCell className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Branch
                                  </TableCell>
                                  <TableHead
                                    scope="row"
                                    className="h-auto pl-5 font-medium whitespace-normal"
                                  >
                                    {branch.name}
                                  </TableHead>
                                  <TableCell>{company.name}</TableCell>
                                  <TableCell className="text-right font-semibold tabular-nums">
                                    {numberFormatter.format(branch.assetCount)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatShare(
                                      branch.assetCount,
                                      inventoryTotal
                                    )}
                                    %
                                  </TableCell>
                                </TableRow>,
                                ...branch.outlets.map((outlet) => (
                                  <TableRow key={`outlet-${outlet.id}`}>
                                    <TableCell className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                      Outlet
                                    </TableCell>
                                    <TableHead
                                      scope="row"
                                      className="h-auto pl-8 font-normal whitespace-normal"
                                    >
                                      {outlet.name}
                                    </TableHead>
                                    <TableCell>{branch.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {numberFormatter.format(
                                        outlet.assetCount
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {formatShare(
                                        outlet.assetCount,
                                        inventoryTotal
                                      )}
                                      %
                                    </TableCell>
                                  </TableRow>
                                )),
                              ])}
                            </TableBody>
                          ))}
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card size="sm" className="xl:col-span-12">
                  <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
                    <Building2
                      className="mb-3 size-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="font-medium">No recorded asset locations</p>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Assets appear here after assignment to an outlet in your
                      visible scope.
                    </p>
                  </CardContent>
                </Card>
              ))}

            {data.recentMovements && (
              <Card size="sm" className="min-w-0 xl:col-span-12">
                <CardHeader className="border-b">
                  <div>
                    <CardTitle>
                      <h2 id="recent-transfers-title">Recent transfers</h2>
                    </CardTitle>
                    <CardDescription>
                      Latest standalone asset movements in visible scope.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Truck
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div
                    role="region"
                    aria-labelledby="recent-transfers-title"
                    tabIndex={0}
                    className="overflow-x-auto rounded-lg border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_[data-slot=table-container]]:overflow-x-visible"
                  >
                    <Table className="min-w-180">
                      <TableCaption className="sr-only">
                        Five most recent standalone asset transfers
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Assigned to</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentMovements.length ? (
                          data.recentMovements.map((movement) => (
                            <TableRow key={movement.id}>
                              <TableCell className="text-muted-foreground tabular-nums">
                                <time dateTime={movement.transferDate}>
                                  {formatDate(movement.transferDate)}
                                </time>
                              </TableCell>
                              <TableHead
                                scope="row"
                                className="h-auto align-middle font-normal text-foreground"
                              >
                                {data.canReadTransfers ? (
                                  <Link
                                    href={`/distribution/asset-transfer/${movement.id}`}
                                    className="font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                  >
                                    {movement.assetNumber}
                                  </Link>
                                ) : (
                                  <span className="font-medium">
                                    {movement.assetNumber}
                                  </span>
                                )}
                                <span className="block max-w-48 text-xs break-words whitespace-normal text-muted-foreground">
                                  {movement.assetName}
                                </span>
                              </TableHead>
                              <TableCell>{movement.outletName}</TableCell>
                              <TableCell>{movement.assignedUserName}</TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                                    movement.status === "RECEIVED"
                                      ? "bg-chart-3/15"
                                      : "bg-chart-4/15"
                                  }`}
                                >
                                  {movement.status === "RECEIVED" ? (
                                    <Check
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Clock3
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {movement.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center">
                              <p className="font-medium">
                                No standalone transfers yet
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                New movements appear here after creation.
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
