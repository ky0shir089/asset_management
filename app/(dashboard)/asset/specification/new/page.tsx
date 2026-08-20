import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SpecForm from "../_components/SpecForm"

export default function AssetSpecNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/specification" />
        <CardTitle className="text-2xl">Create Asset Specification</CardTitle>
      </CardHeader>

      <CardContent>
        <SpecForm />
      </CardContent>
    </Card>
  )
}
