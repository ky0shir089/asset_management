import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assetBrandShow } from "@/data/asset-brand"
import { Suspense } from "react"
import AssetBrandForm from "../../_components/AssetBrandForm"

type Params = Promise<{ brandId: string }>

const RenderForm = async ({ brandId }: { brandId: string }) => {
  const data = await assetBrandShow(brandId)

  return <AssetBrandForm data={data} />
}

export default async function AssetBrandEditPage({
  params,
}: {
  params: Params
}) {
  const { brandId } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Edit Asset Brand</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm brandId={brandId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
