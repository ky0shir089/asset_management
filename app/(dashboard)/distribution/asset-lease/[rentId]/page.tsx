import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { assetLeaseShow } from "@/data/asset-lease"
import { Check, Clock3, MapPin, UserRound } from "lucide-react"
import type { ReactNode } from "react"
import AssetLeaseDecisionActions from "../_components/AssetLeaseDecisionActions"
import { PhotoCarousel } from "@/components/photo-carousel"
import AssetLeaseStatusBadge from "../_components/AssetLeaseStatusBadge"
import AssetLeaseTransferAction from "../_components/AssetLeaseTransferAction"
import AssetLeaseReturnAction from "../_components/AssetLeaseReturnAction"

type Params = Promise<{ rentId: string }>

function jakartaToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

const PHOTO_GROUPS = [
  ["BEFORE", "Before lease"],
  ["APPROVE", "Approval"],
  ["REJECT", "Rejection"],
  ["RETURN", "Return"],
] as const

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function formatReceiptTime(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown time"
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-3 border rounded-md">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium wrap-break-word">{value}</div>
    </div>
  )
}

export default async function AssetLeaseDetailPage({
  params,
}: {
  params: Params
}) {
  const { rentId } = await params
  const data = await assetLeaseShow(rentId)
  return (
    <div className="space-y-6">
      <BackButton href="/distribution/asset-lease" />

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">
                <h1 id="asset-lease-detail-title" tabIndex={-1}>
                  Asset Lease Detail
                </h1>
              </CardTitle>
              <p className="font-medium">{data.rentNo}</p>
              <p className="text-sm text-muted-foreground">
                {data.company?.name ?? "-"}
              </p>
            </div>
            <AssetLeaseStatusBadge status={data.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {data.canDecide && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending decision
                </p>
                <p className="font-semibold">{data.company?.name ?? "-"}</p>
              </div>
              <AssetLeaseDecisionActions
                id={data.id}
                status={data.status}
                rentDate={data.rentDate}
                defaultReceiveDate={jakartaToday()}
                details={data.details.map((detail) => ({
                  id: detail.id,
                  assetNumber: detail.asset.nomorAssets,
                  assetName:
                    detail.asset.poDetail?.prDetail?.assetCode?.name ?? "-",
                }))}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <InfoItem label="Lease Date" value={data.rentDate} />
            <InfoItem label="Receive Date" value={data.receiveDate ?? "-"} />
            <InfoItem label="Company" value={data.company?.name ?? "-"} />
            <InfoItem label="Note" value={data.note ?? "-"} />
            <InfoItem
              label="Status"
              value={<AssetLeaseStatusBadge status={data.status} />}
            />
            {data.status === "REJECTED" && (
              <div className="p-3 border rounded-md sm:col-span-2 lg:col-span-5">
                <p className="text-sm text-muted-foreground">
                  Rejection Reason
                </p>
                <p className="mt-1 font-medium wrap-break-word">
                  {data.reason ?? "-"}
                </p>
              </div>
            )}
          </div>

          <section>
            <h2 className="mb-3 font-semibold">Lease Details</h2>
            <div className="overflow-x-auto border rounded-md">
              <Table className="min-w-3xl">
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset No</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Photos</TableHead>
                    {data.canTransfer && <TableHead>Transfer</TableHead>}
                    {data.canReturn && <TableHead>Return</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.length ? (
                    data.details.map((detail) => {
                      const isReturned = Boolean(detail.dateEnd)
                      const hasPendingTransfer =
                        detail.latestTransfer?.status === "PENDING"
                      const minimumReturnDate =
                        detail.latestTransfer?.transferDate &&
                        detail.latestTransfer.transferDate > (detail.dateStart ?? "")
                          ? detail.latestTransfer.transferDate
                          : (detail.dateStart ?? data.rentDate)

                      return (
                        <TableRow key={detail.id}>
                          <TableCell className="font-medium">
                            {detail.asset?.nomorAssets ?? "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {detail.asset?.poDetail?.prDetail?.assetCode?.name ??
                              "-"}
                          </TableCell>
                          <TableCell>{detail.dateStart ?? "-"}</TableCell>
                          <TableCell>{detail.dateEnd ?? "-"}</TableCell>
                          <TableCell className="text-right">
                            {(detail.amount ?? 0).toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-36 space-y-3">
                              {PHOTO_GROUPS.map(([type, label]) => {
                                const photos = detail.photos.filter(
                                  (photo) => photo.type === type
                                )
                                if (!photos.length) return null
                                return (
                                  <div key={type} className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {label}
                                    </p>
                                    <PhotoCarousel
                                      photos={photos}
                                      layout="inline"
                                    />
                                  </div>
                                )
                              })}
                              {!detail.photos.some(
                                (photo) => photo.type !== "RECEIVE"
                              ) && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          {data.canTransfer && (
                            <TableCell>
                              {!isReturned ? (
                                <AssetLeaseTransferAction
                                  rentId={data.id}
                                  rentDetailId={detail.id}
                                  assetNumber={detail.asset.nomorAssets}
                                  defaultTransferDate={jakartaToday()}
                                  currentOutlet={detail.asset.outlet}
                                  latestTransfer={detail.latestTransfer}
                                  outlets={data.transferOutlets}
                                  users={data.transferUsers}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                          )}
                          {data.canReturn && (
                            <TableCell>
                              {isReturned ? (
                                <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                  Returned
                                </span>
                              ) : (
                                <AssetLeaseReturnAction
                                  rentId={data.id}
                                  rentDetailId={detail.id}
                                  assetNumber={detail.asset.nomorAssets}
                                  defaultReturnDate={jakartaToday()}
                                  minimumReturnDate={minimumReturnDate}
                                  hasPendingTransfer={hasPendingTransfer}
                                  outlets={data.returnOutlets}
                                />
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={
                          6 + (data.canTransfer ? 1 : 0) + (data.canReturn ? 1 : 0)
                        }
                        className="h-24 text-center"
                      >
                        No lease details.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>

              </Table>
            </div>
          </section>

          <section aria-labelledby="transfer-history-title">
            <div className="mb-3">
              <h2 id="transfer-history-title" className="font-semibold">
                Transfer History
              </h2>
              <p className="text-sm text-muted-foreground">
                Custody and receipt evidence for each leased asset.
              </p>
            </div>

            <div className="space-y-4">
              {data.details.map((detail) => {
                const assetHeadingId = `asset-history-${detail.id}`
                const assetName =
                  detail.asset.poDetail?.prDetail?.assetCode?.name ?? "-"

                return (
                  <article
                    key={detail.id}
                    className="overflow-hidden rounded-lg border bg-card"
                    aria-labelledby={assetHeadingId}
                  >
                    <header className="border-b bg-muted/30 p-4">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Asset custody
                      </p>
                      <div className="mt-1 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                        <h3
                          id={assetHeadingId}
                          className="font-semibold wrap-break-word"
                        >
                          {detail.asset.nomorAssets}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {assetName}
                        </p>
                      </div>
                    </header>

                    <div className="p-4">
                      {detail.transferHistory.length ? (
                        <ol
                          className="relative ml-2 border-l"
                          aria-label={`Transfer history for ${detail.asset.nomorAssets}`}
                        >
                          {detail.transferHistory.map((transfer, transferIndex) => {
                            const received = transfer.status === "RECEIVED"
                            const transferHeadingId = `transfer-${transfer.id}`

                            return (
                              <li
                                key={transfer.id}
                                className="relative pb-6 pl-6 last:pb-0"
                              >
                                <span
                                  className={`absolute -left-2.5 flex size-5 items-center justify-center rounded-full ring-4 ring-card ${
                                    received
                                      ? "bg-emerald-600 text-white dark:bg-emerald-500"
                                      : "bg-amber-500 text-amber-950"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {received ? (
                                    <Check className="size-3" />
                                  ) : (
                                    <Clock3 className="size-3" />
                                  )}
                                </span>

                                <section
                                  className="rounded-lg border p-3 sm:p-4"
                                  aria-labelledby={transferHeadingId}
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <h4 id={transferHeadingId}>
                                        <span
                                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                            received
                                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                                              : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                          }`}
                                        >
                                          Transfer{" "}
                                          {detail.transferHistory.length - transferIndex} ·{" "}
                                          {received
                                            ? "Received"
                                            : "Awaiting receipt"}
                                        </span>
                                      </h4>
                                      <div className="mt-2 flex items-start gap-2">
                                        <MapPin
                                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                          aria-hidden="true"
                                        />
                                        <div>
                                          <p className="font-medium">
                                            {transfer.outletName}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Destination outlet
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <time
                                      dateTime={transfer.transferDate}
                                      className="text-xs whitespace-nowrap text-muted-foreground"
                                    >
                                      {transfer.transferDate}
                                    </time>
                                  </div>

                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                                      <Avatar size="sm" aria-hidden="true">
                                        {transfer.assignedUserImage && (
                                          <AvatarImage
                                            src={transfer.assignedUserImage}
                                            alt=""
                                          />
                                        )}
                                        <AvatarFallback>
                                          {initials(transfer.assignedUserName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">
                                          Assigned to
                                        </p>
                                        <p className="font-medium wrap-break-word">
                                          {transfer.assignedUserName}
                                        </p>
                                      </div>
                                    </div>

                                    {transfer.confirmedByName && (
                                      <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                                        <Avatar size="sm" aria-hidden="true">
                                          {transfer.confirmedByImage && (
                                            <AvatarImage
                                              src={transfer.confirmedByImage}
                                              alt=""
                                            />
                                          )}
                                          <AvatarFallback>
                                            {initials(transfer.confirmedByName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                          <p className="text-xs text-muted-foreground">
                                            Confirmed by
                                          </p>
                                          <p className="font-medium wrap-break-word">
                                            {transfer.confirmedByName}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {transfer.receivedAt && (
                                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Clock3
                                        className="size-3.5"
                                        aria-hidden="true"
                                      />
                                      Received{" "}
                                      {formatReceiptTime(transfer.receivedAt)}
                                    </p>
                                  )}

                                  <div className="mt-4 border-t pt-3">
                                    <h5 className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                                      <UserRound
                                        className="size-3.5 text-muted-foreground"
                                        aria-hidden="true"
                                      />
                                      Receipt photos
                                    </h5>
                                    {transfer.receiptPhotos.length ? (
                                      <PhotoCarousel
                                        photos={transfer.receiptPhotos}
                                        label={`Receipt evidence for asset ${detail.asset.nomorAssets}, transfer ${detail.transferHistory.length - transferIndex}`}
                                        layout="inline"
                                      />
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        {received
                                          ? "No receipt photos recorded."
                                          : "Photos appear after assigned user confirms receipt."}
                                      </p>
                                    )}
                                  </div>
                                </section>
                              </li>
                            )
                          })}
                        </ol>
                      ) : (
                        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                          No transfers recorded for this asset.
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
