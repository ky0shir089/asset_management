import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assetCategoryOptions } from "@/data/select"
import { Suspense } from "react"
import AssetCodeForm from "../_components/AssetCodeForm"

const RenderForm = async () => {
  const categories = await assetCategoryOptions()

  return <AssetCodeForm categories={categories} />
}

export default function AssetCodeNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Asset Code</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
