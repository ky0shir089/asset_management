import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AssetBrandForm from "../_components/AssetBrandForm"

export default function AssetBrandNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Asset Brand</CardTitle>
      </CardHeader>

      <CardContent>
        <AssetBrandForm />
      </CardContent>
    </Card>
  )
}
