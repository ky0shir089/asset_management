import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AssetCategoryForm from "../_components/AssetCategoryForm"

export default function AssetCategoryNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Asset Category</CardTitle>
      </CardHeader>

      <CardContent>
        <AssetCategoryForm />
      </CardContent>
    </Card>
  )
}
