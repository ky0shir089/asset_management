import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { receivedAssetShow } from "@/data/received-asset"
import Image from "next/image"
import { PhotoCarousel } from "@/components/photo-carousel"
import { BackButton } from "@/components/back-button"

type Params = Promise<{ receiveId: string }>

function formatNomorAssets(nomor: string) {
  return nomor
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/asset-transaction/received-asset" />
        <h2 className="text-3xl font-bold">Received Asset Detail</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <InfoRow
              label="Asset Number"
              value={formatNomorAssets(data.nomorAssets)}
            />
            <InfoRow label="Condition" value={data.condition ?? "-"} />
            <InfoRow label="Status" value={data.status} />
            <InfoRow
              label="Asset Code"
              value={assetCode ? `${assetCode.code} - ${assetCode.name}` : "-"}
            />
            <InfoRow
              label="Company"
              value={company ? `${company.code} - ${company.name}` : "-"}
            />
            <InfoRow
              label="Outlet"
              value={outlet ? `${outlet.name} (${outlet.branch?.name ?? ""})` : "-"}
            />
            <InfoRow
              label="PO Description"
              value={po?.description ?? "-"}
            />
          </dl>
        </CardContent>
      </Card>

      {/* QR Code */}
      {data.qrCodePath && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Image
              src={data.qrCodePath}
              alt={`QR for ${data.nomorAssets}`}
              width={200}
              height={200}
              className="rounded border"
            />
            <a
              href={data.qrCodePath}
              download
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Download QR
            </a>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.photos.length > 0 ? (
            <PhotoCarousel photos={data.photos} />
          ) : (
            <p className="text-sm">No photos uploaded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
