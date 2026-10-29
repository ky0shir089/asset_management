import { BackButton } from "@/components/back-button"
import { PhotoCarousel } from "@/components/photo-carousel"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { receivedAssetShow } from "@/data/received-asset"
import { cn } from "@/lib/utils"
import { Cpu, Download, Images, Package, QrCode } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"

type Params = Promise<{ receiveId: string }>

function InfoItem({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-lg bg-muted/40 p-3", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold break-words">{value ?? "-"}</dd>
    </div>
  )
}

export default async function ReceivedAssetDetailPage({
  params,
}: {
  params: Params
}) {
  const { receiveId } = await params
  const data = await receivedAssetShow(receiveId)

  const assetCode = data.poDetail?.prDetail?.assetCode
  const po = data.poDetail?.purchaseOrder
  const company = po?.purchaseRequest?.company
  const outlet = data.outlet
  const specifications = data.poDetail?.prDetail?.specifications ?? []

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <BackButton href="/asset-transaction/received-asset" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Asset {data.nomorAssets}
              </h1>
              {data.condition && (
                <Badge variant="secondary">{data.condition}</Badge>
              )}
              <Badge variant="outline">{data.status}</Badge>
            </div>
            <p className="mt-1 text-sm break-words text-muted-foreground">
              {assetCode
                ? `${assetCode.code} · ${assetCode.name}`
                : "Received Asset Detail"}
              {company ? ` · ${company.name}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Package className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Asset Information</CardTitle>
                <CardDescription>
                  General identifiers, location, and purchase details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Asset Number" value={data.nomorAssets} />
              <InfoItem
                label="Serial Number"
                value={data.serialNumber || "-"}
              />
              <InfoItem label="Aktiva" value={data.aktiva || "-"} />
              <InfoItem label="Condition" value={data.condition ?? "-"} />
              <InfoItem label="Status" value={data.status} />
              <InfoItem
                label="Asset Code"
                value={
                  assetCode ? `${assetCode.code} - ${assetCode.name}` : "-"
                }
              />
              <InfoItem
                label="Company"
                value={company ? `${company.code} - ${company.name}` : "-"}
              />
              <InfoItem
                label="Outlet"
                value={
                  outlet ? `${outlet.name} (${outlet.branch?.name ?? ""})` : "-"
                }
              />
              <InfoItem label="PO Number" value={po?.poNo ?? "-"} />
              <InfoItem
                label="PO Description"
                value={po?.description ?? "-"}
                className="sm:col-span-2"
              />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Cpu className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Asset Specifications</CardTitle>
                  <CardDescription>
                    Technical specifications from purchase request.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {specifications.length > 0 ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {specifications.map((item) => (
                    <InfoItem
                      key={item.id}
                      label={item.spec?.name ?? "Specification"}
                      value={item.specValue || "-"}
                    />
                  ))}
                </dl>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No technical specifications recorded for this asset.
                </div>
              )}
            </CardContent>
          </Card>

          {data.qrCodePath && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <QrCode className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle>QR Code</CardTitle>
                    <CardDescription>
                      Quick response code for physical asset tracking.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-start">
                <div className="relative rounded-lg border bg-white p-2 shadow-xs">
                  <Image
                    src={data.qrCodePath}
                    alt={`QR for ${data.nomorAssets}`}
                    width={130}
                    height={130}
                    className="rounded object-contain"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-sm font-medium">Tracking Label</p>
                  <p className="text-xs text-muted-foreground">
                    Download or print QR code label to attach to the physical
                    asset.
                  </p>
                  <a
                    href={data.qrCodePath}
                    download={`QR-${data.nomorAssets}.png`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <Download className="mr-2 size-4" />
                    Download QR
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Images className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Asset Photos ({data.photos.length})</CardTitle>
              <CardDescription>
                Asset photos and inspection documentation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {data.photos.length > 0 ? (
            <PhotoCarousel photos={data.photos} />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No photos uploaded for this asset.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
