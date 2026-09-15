import AssetLeaseStatusBadge from "@/app/(dashboard)/distribution/asset-lease/_components/AssetLeaseStatusBadge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AssetMaintenanceDetail } from "@/data/maintenance"
import { cn } from "@/lib/utils"
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  DollarSign,
  History,
  MapPin,
  Package,
  UserRound,
  Wrench,
} from "lucide-react"
import type { ReactNode } from "react"

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
})
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
})
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

function formatDate(value: string | Date | null) {
  return value ? dateFormatter.format(new Date(value)) : "-"
}

function formatDateTime(value: Date | null) {
  return value ? dateTimeFormatter.format(value) : "-"
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 p-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-medium break-words">{value}</dd>
    </div>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function UserIdentity({
  image,
  label,
  name,
}: {
  image: string | null
  label: string
  name: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/40 p-3">
      <Avatar aria-hidden="true">
        {image && <AvatarImage src={image} alt="" />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{name}</p>
      </div>
    </div>
  )
}

type OverviewProps = Pick<AssetMaintenanceDetail, "asset" | "currentHolder">

export function AssetOverviewCard({ asset, currentHolder }: OverviewProps) {
  const showSensitiveFields =
    asset.purchasePrice !== null || asset.status !== "-"

  return (
    <Card aria-labelledby="asset-overview-title">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Package className="size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>
              <h2 id="asset-overview-title">Informasi Asset</h2>
            </CardTitle>
            <CardDescription>
              Identitas, lokasi, dan pengguna saat ini.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <InfoItem label="Nomor Asset" value={asset.assetNumber} />
          <InfoItem label="Kategori" value={asset.categoryName} />
          <InfoItem label="Kode Asset" value={asset.assetCodeName} />
          <InfoItem label="Lokasi Outlet" value={asset.outletName} />
          <InfoItem label="Kondisi" value={asset.condition ?? "-"} />
          {showSensitiveFields && (
            <>
              <InfoItem label="Status" value={asset.status} />
              <InfoItem
                label="Harga Beli"
                value={
                  <span className="tabular-nums">
                    {asset.purchasePrice != null
                      ? priceFormatter.format(asset.purchasePrice)
                      : "-"}
                  </span>
                }
              />
            </>
          )}
        </dl>

        <div className="border-t pt-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Pengguna Asset Saat Ini
          </p>
          {currentHolder ? (
            <UserIdentity
              image={currentHolder.image}
              label="Pemegang terakhir yang sudah menerima asset"
              name={currentHolder.name}
            />
          ) : (
            <EmptyState>
              Asset belum diserahterimakan kepada pengguna.
            </EmptyState>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type LeaseHistoryProps = Pick<AssetMaintenanceDetail, "leases">

export function AssetLeaseHistory({ leases }: LeaseHistoryProps) {
  return (
    <Card aria-labelledby="asset-lease-title">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>
              <h2 id="asset-lease-title">Data Sewa</h2>
            </CardTitle>
            <CardDescription>
              Perusahaan dan periode sewa asset ({leases.length}).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {leases.length ? (
          <div className="space-y-3">
            {leases.map((lease) => {
              const active =
                lease.status === "APPROVED" &&
                lease.dateStart !== null &&
                lease.dateEnd === null

              return (
                <article
                  key={lease.id}
                  className={cn(
                    "rounded-lg border p-4",
                    active && "border-primary/30 bg-primary/5"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold break-words">
                          {lease.rentNo}
                        </h3>
                        {active && <Badge>Sewa Aktif</Badge>}
                        <AssetLeaseStatusBadge status={lease.status} />
                      </div>
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <Building2
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="break-words">
                          {lease.companyCode} - {lease.companyName}
                        </span>
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {lease.amount != null
                        ? priceFormatter.format(lease.amount)
                        : "-"}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t pt-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Tanggal Sewa
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {formatDate(lease.rentDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Mulai</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatDate(lease.dateStart)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Selesai</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatDate(lease.dateEnd)}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState>Asset belum memiliki data sewa.</EmptyState>
        )}
      </CardContent>
    </Card>
  )
}

type TransferHistoryProps = Pick<AssetMaintenanceDetail, "transferHistory">

export function AssetTransferHistory({
  transferHistory,
}: TransferHistoryProps) {
  return (
    <Card aria-labelledby="asset-transfer-title">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <History className="size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>
              <h2 id="asset-transfer-title">Riwayat Transfer Asset</h2>
            </CardTitle>
            <CardDescription>
              Perpindahan lokasi dan serah terima pengguna (
              {transferHistory.length}).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transferHistory.length ? (
          <ol
            className="relative ml-2 border-l"
            aria-label="Riwayat transfer asset"
          >
            {transferHistory.map((transfer, index) => {
              const received = transfer.status === "RECEIVED"
              const headingId = `transfer-${transfer.id}`

              return (
                <li key={transfer.id} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-2.5 flex size-5 items-center justify-center rounded-full ring-4 ring-card",
                      received
                        ? "bg-emerald-600 text-white dark:bg-emerald-500"
                        : "bg-amber-500 text-amber-950"
                    )}
                    aria-hidden="true"
                  >
                    {received ? (
                      <Check className="size-3" />
                    ) : (
                      <Clock3 className="size-3" />
                    )}
                  </span>

                  <article
                    className="rounded-lg border p-3 sm:p-4"
                    aria-labelledby={headingId}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 id={headingId} className="font-semibold">
                            Transfer {transferHistory.length - index}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              received
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            )}
                          >
                            {received ? "Diterima" : "Menunggu Penerimaan"}
                          </Badge>
                        </div>
                        <p className="mt-2 flex items-start gap-1.5 text-sm">
                          <MapPin
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="font-medium break-words">
                              {transfer.outletName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Outlet tujuan
                            </span>
                          </span>
                        </p>
                      </div>
                      <time
                        dateTime={transfer.transferDate}
                        className="text-xs whitespace-nowrap text-muted-foreground"
                      >
                        {formatDate(transfer.transferDate)}
                      </time>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <UserIdentity
                        image={transfer.assignedUserImage}
                        label="Diberikan kepada"
                        name={transfer.assignedUserName}
                      />
                      {transfer.confirmedByName ? (
                        <UserIdentity
                          image={transfer.confirmedByImage}
                          label="Dikonfirmasi oleh"
                          name={transfer.confirmedByName}
                        />
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-muted-foreground">
                          <UserRound className="size-8" aria-hidden="true" />
                          <div>
                            <p className="text-xs">Konfirmasi penerimaan</p>
                            <p className="text-sm font-medium">
                              Belum dikonfirmasi
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <dl className="mt-4 grid gap-3 border-t pt-3 sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Sumber
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {transfer.rentNo
                            ? `Sewa ${transfer.rentNo}`
                            : "Transfer mandiri"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Perusahaan Sewa
                        </dt>
                        <dd className="mt-0.5 font-medium break-words">
                          {transfer.companyName
                            ? `${transfer.companyCode} - ${transfer.companyName}`
                            : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Kondisi
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {transfer.condition ?? "-"}
                        </dd>
                      </div>
                    </dl>

                    {transfer.receivedAt && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        Diterima {formatDateTime(transfer.receivedAt)}
                      </p>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
        ) : (
          <EmptyState>Belum ada perpindahan asset yang tercatat.</EmptyState>
        )}
      </CardContent>
    </Card>
  )
}

type MaintenanceProps = Pick<AssetMaintenanceDetail, "maintenanceHistory">

export function AssetMaintenanceSection({
  maintenanceHistory,
}: MaintenanceProps) {
  const latest = maintenanceHistory[0]

  return (
    <Card aria-labelledby="asset-maintenance-title">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Wrench className="size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>
              <h2 id="asset-maintenance-title">Riwayat Maintenance</h2>
            </CardTitle>
            <CardDescription>
              Catatan biaya dan pekerjaan maintenance (
              {maintenanceHistory.length}).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {latest ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <section aria-labelledby="latest-maintenance-title">
              <h3 id="latest-maintenance-title" className="mb-3 font-semibold">
                Maintenance Terakhir
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-primary/5 p-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    Biaya
                  </span>
                  <span className="font-semibold text-primary tabular-nums">
                    {priceFormatter.format(latest.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <CalendarDays
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Tanggal dicatat
                    </p>
                    <p className="font-medium">
                      {formatDate(latest.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <UserRound
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Dicatat oleh
                    </p>
                    <p className="font-medium">{latest.creatorName ?? "-"}</p>
                  </div>
                </div>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4"
                  dangerouslySetInnerHTML={{ __html: latest.detail }}
                />
              </div>
            </section>

            <section aria-labelledby="all-maintenance-title">
              <h3 id="all-maintenance-title" className="mb-3 font-semibold">
                Semua Catatan
              </h3>
              <div className="divide-y rounded-lg border px-4">
                {maintenanceHistory.map((item, index) => (
                  <article key={item.id} className="py-4 first:pt-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <time className="font-semibold">
                            {formatDate(item.createdAt)}
                          </time>
                          {index === 0 && (
                            <Badge variant="secondary">Terbaru</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Oleh {item.creatorName ?? "-"}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {priceFormatter.format(item.amount)}
                      </span>
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert mt-3 max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: item.detail }}
                    />
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <EmptyState>
            Belum ada catatan maintenance untuk asset ini.
          </EmptyState>
        )}
      </CardContent>
    </Card>
  )
}
