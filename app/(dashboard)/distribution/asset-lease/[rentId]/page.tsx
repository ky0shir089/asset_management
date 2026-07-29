import { buttonVariants } from "@/components/ui/button"
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
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import AssetLeaseDecisionActions from "../_components/AssetLeaseDecisionActions"
import AssetLeaseStatusBadge from "../_components/AssetLeaseStatusBadge"

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

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
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
    <>
      <Link
        href="/distribution/asset-lease"
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "w-fit",
        })}
      >
        Back
      </Link>

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
            <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="rounded-md border p-3 sm:col-span-2 lg:col-span-5">
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
            <span id="asset-lease-photo-new-tab" className="sr-only">
              Photo links open in a new tab.
            </span>
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-3xl">
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset No</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Photos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.length ? (
                    data.details.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell className="font-medium">
                          {detail.asset?.nomorAssets ?? "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {detail.asset?.poDetail?.prDetail?.assetCode?.name ??
                            "-"}
                        </TableCell>
                        <TableCell>{detail.dateStart}</TableCell>
                        <TableCell className="text-right">
                          {(detail.amount ?? 0).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-36 flex-wrap gap-2">
                            {detail.photos.length ? (
                              detail.photos.map((photo) => (
                                <a
                                  key={photo.id}
                                  href={photo.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open ${photo.name}`}
                                  aria-describedby="asset-lease-photo-new-tab"
                                  className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                                >
                                  <Image
                                    src={photo.path}
                                    alt={photo.name}
                                    width={56}
                                    height={56}
                                    className="size-14 rounded-md border object-cover"
                                  />
                                </a>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No lease details.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </CardContent>
      </Card>
    </>
  )
}
