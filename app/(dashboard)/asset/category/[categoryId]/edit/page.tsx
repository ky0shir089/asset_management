import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { assetCategoryShow } from "@/data/asset-category"
import { Suspense } from "react"
import FormSkeleton from "@/components/form-skeleton"
import AssetCategoryForm from "../../_components/AssetCategoryForm"

type Params = Promise<{ categoryId: string }>

const RenderForm = async ({ categoryId }: { categoryId: string }) => {
  const data = await assetCategoryShow(categoryId)

  return <AssetCategoryForm data={data} />
}

export default async function AssetCategoryEditPage({
  params,
}: {
  params: Params
}) {
  const { categoryId } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Edit Asset Category</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm categoryId={categoryId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
