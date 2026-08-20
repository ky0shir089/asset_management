import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AssetCategoryForm from "../_components/AssetCategoryForm"

export default function AssetCategoryNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/category" />
        <CardTitle className="text-2xl">Create Asset Category</CardTitle>
      </CardHeader>

      <CardContent>
        <AssetCategoryForm />
      </CardContent>
    </Card>
  )
}
