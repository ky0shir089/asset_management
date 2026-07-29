import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assetCategoryOptions, assetLeaseCompanyOptions } from "@/data/select"
import { requirePermission } from "@/lib/auth/permission"
import { Suspense } from "react"
import AssetLeaseForm from "../_components/AssetLeaseForm"

const RenderForm = async () => {
  await requirePermission("asset-lease:create")

  const [companies, categories] = await Promise.all([
    assetLeaseCompanyOptions(),
    assetCategoryOptions(),
  ])

  return <AssetLeaseForm companies={companies} categories={categories} />
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
