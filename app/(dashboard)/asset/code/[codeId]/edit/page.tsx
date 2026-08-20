import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assetCodeShow } from "@/data/asset-code"
import { assetCategoryOptions } from "@/data/select"
import { Suspense } from "react"
import AssetCodeForm from "../../_components/AssetCodeForm"

type Params = Promise<{ codeId: string }>

const RenderForm = async ({ codeId }: { codeId: string }) => {
  const [data, categories] = await Promise.all([
    assetCodeShow(codeId),
    assetCategoryOptions(),
  ])

  return <AssetCodeForm data={data} categories={categories} />
}

export default async function AssetCodeEditPage({ params }: { params: Params }) {
  const { codeId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/code" />
        <CardTitle className="text-2xl">Edit Asset Code</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm codeId={codeId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
