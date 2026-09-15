import { BackButton } from "@/components/back-button"
import { getAssetMaintenanceDetail } from "@/data/maintenance"
import {
  AssetLeaseHistory,
  AssetMaintenanceSection,
  AssetOverviewCard,
  AssetTransferHistory,
} from "../_components/AssetDetailSections"

type Params = Promise<{ assetId: string }>

export default async function AssetMaintenanceDetailPage({
  params,
}: {
  params: Params
}) {
  const { assetId } = await params
  const data = await getAssetMaintenanceDetail(assetId)

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex items-start gap-3 sm:items-center sm:gap-4">
        <BackButton href="/asset/list-asset" />
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Asset {data.asset.assetNumber}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Detail Asset
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informasi kepemilikan, sewa, transfer, dan maintenance.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <AssetOverviewCard
          asset={data.asset}
          currentHolder={data.currentHolder}
        />
        <AssetLeaseHistory leases={data.leases} />
      </div>

      <AssetTransferHistory transferHistory={data.transferHistory} />
      <AssetMaintenanceSection maintenanceHistory={data.maintenanceHistory} />
    </main>
  )
}
