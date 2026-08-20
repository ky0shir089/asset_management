import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AssetBrandForm from "../_components/AssetBrandForm"

export default function AssetBrandNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/brand" />
        <CardTitle className="text-2xl">Create Asset Brand</CardTitle>
      </CardHeader>

      <CardContent>
        <AssetBrandForm />
      </CardContent>
    </Card>
  )
}
