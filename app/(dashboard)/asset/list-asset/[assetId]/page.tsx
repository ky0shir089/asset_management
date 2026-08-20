import { getAssetMaintenanceDetail } from "@/data/maintenance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/back-button"
import { Wrench, Calendar, DollarSign, User, Package } from "lucide-react"

type Params = Promise<{ assetId: string }>

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
})

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
    </div>
  )
}

export default async function AssetMaintenanceDetailPage({
  params,
}: {
  params: Params
}) {
  const { assetId } = await params
  const { asset, maintenanceHistory } = await getAssetMaintenanceDetail(assetId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/asset/list-asset" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Detail Asset & Maintenance
          </h2>
          <p className="text-sm text-muted-foreground">
            Informasi asset dan riwayat perbaikan {asset.assetNumber}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Detail Asset */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2 border-b pb-4">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle>Informasi Asset</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="divide-y">
              <InfoRow label="Nomor Asset" value={asset.assetNumber} />
              <InfoRow label="Kategori" value={asset.categoryName} />
              <InfoRow label="Kode Asset" value={asset.assetCodeName} />
              <InfoRow label="Lokasi Outlet" value={asset.outletName} />
              <InfoRow
                label="Harga Beli"
                value={
                  asset.purchasePrice != null
                    ? priceFormatter.format(asset.purchasePrice)
                    : "-"
                }
              />
              <InfoRow label="Status" value={asset.status} />
              <InfoRow label="Kondisi" value={asset.condition ?? "-"} />
            </dl>
          </CardContent>
        </Card>

        {/* Latest Maintenance / Summary */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center gap-2 border-b pb-4">
            <Wrench className="h-5 w-5 text-primary" />
            <CardTitle>Maintenance Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {maintenanceHistory.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada catatan maintenance untuk asset ini.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Biaya Terakhir</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {priceFormatter.format(maintenanceHistory[0].amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Tanggal Dicatat</span>
                  </div>
                  <span className="text-sm">
                    {new Date(maintenanceHistory[0].createdAt).toLocaleDateString(
                      "id-ID",
                      { dateStyle: "full" }
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Dicatat Oleh</span>
                  </div>
                  <span className="text-sm">
                    {maintenanceHistory[0].creatorName ?? "-"}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Detail Pekerjaan / Pemeliharaan:
                  </span>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-background p-4"
                    dangerouslySetInnerHTML={{
                      __html: maintenanceHistory[0].detail,
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance History */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>
            Riwayat Maintenance Asset ({maintenanceHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {maintenanceHistory.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada riwayat maintenance untuk asset ini.
            </p>
          ) : (
            <div className="space-y-4 divide-y">
              {maintenanceHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className={`pt-4 first:pt-0 ${
                    idx === 0 ? "rounded-md bg-primary/5 p-3" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {new Date(item.createdAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                        {idx === 0 && (
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Terbaru
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Oleh: {item.creatorName ?? "-"}
                      </p>
                    </div>
                    <span className="text-sm font-bold">
                      {priceFormatter.format(item.amount)}
                    </span>
                  </div>
                  <div
                    className="prose prose-sm dark:prose-invert mt-2 max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: item.detail }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
