import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assetLeaseCompanyOptions } from "@/data/select"
import { requirePermission } from "@/lib/auth/permission"
import { Suspense } from "react"
import AssetTransferForm from "../_components/AssetTransferForm"

const RenderForm = async () => {
  await requirePermission("asset-transfer:create")
  const companies = await assetLeaseCompanyOptions()

  return <AssetTransferForm companies={companies} />
}

export default function AssetTransferNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/distribution/asset-transfer" />
        <CardTitle className="text-2xl">
          <h1>Create Asset Transfer</h1>
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
