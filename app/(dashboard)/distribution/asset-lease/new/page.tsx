import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  assetLeaseAssetOptions,
  assetLeaseCustomerOptions,
  outletOptions,
} from "@/data/select"
import { requirePermission } from "@/lib/auth/permission"
import { Suspense } from "react"
import AssetLeaseForm from "../_components/AssetLeaseForm"

const RenderForm = async () => {
  await requirePermission("asset-lease:create")

  const [outlets, customers, assets] = await Promise.all([
    outletOptions(),
    assetLeaseCustomerOptions(),
    assetLeaseAssetOptions(),
  ])

  return (
    <AssetLeaseForm outlets={outlets} customers={customers} assets={assets} />
  )
}

export default function AssetLeaseNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>Create Asset Lease</h1>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
