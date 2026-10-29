import { BackButton } from "@/components/back-button"
import { Badge } from "@/components/ui/badge"
import { getAssetMaintenanceDetail } from "@/data/maintenance"
import {
  AssetLeaseHistory,
  AssetMaintenanceSection,
  AssetOverviewCard,
  AssetSpecificationCard,
  AssetTransferHistory,
} from "../_components/AssetDetailSections"
import { AssetBillingHistory } from "../_components/AssetBillingHistory"

type Params = Promise<{ assetId: string }>

export default async function AssetMaintenanceDetailPage({
  params,
}: {
  params: Params
}) {
  const { assetId } = await params
  const data = await getAssetMaintenanceDetail(assetId)

  return (
    <main
      className="mx-auto w-full max-w-7xl space-y-6"
      aria-labelledby="asset-detail-title"
    >
      <header className="flex items-start gap-3 border-b pb-5 sm:gap-4">
        <BackButton href="/asset/list-asset" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1
                id="asset-detail-title"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Asset {data.asset.assetNumber}
              </h1>
              <p className="mt-1 font-medium break-words">
                {data.asset.assetCodeName} · {data.asset.categoryName}
              </p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Informasi kepemilikan, spesifikasi, sewa, transfer, dan
                maintenance asset.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.asset.condition && (
                <Badge variant="secondary">
                  Kondisi: {data.asset.condition}
                </Badge>
              )}
              {data.asset.status !== "-" && (
                <Badge variant="outline">Status: {data.asset.status}</Badge>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AssetOverviewCard
          asset={data.asset}
          currentHolder={data.currentHolder}
        />
        <AssetSpecificationCard
          asset={data.asset}
          specifications={data.specifications}
          photos={data.photos}
        />
      </div>
      <AssetLeaseHistory leases={data.leases} />
      <AssetBillingHistory billingHistory={data.billingHistory} />
      <AssetTransferHistory transferHistory={data.transferHistory} />
      <AssetMaintenanceSection maintenanceHistory={data.maintenanceHistory} />
    </main>
  )
}
