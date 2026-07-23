import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { receivedAssetShow } from "@/data/received-asset"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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
        <Link
          href="/asset-transaction/received-asset"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Link>
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
      {data.photos?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative h-40 w-full overflow-hidden rounded border">
                    <Image
                      src={photo.path}
                      alt={photo.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-contain"
                    />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {photo.name}
                  </p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
