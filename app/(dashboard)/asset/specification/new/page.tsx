import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SpecForm from "../_components/SpecForm"

export default function AssetSpecNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Asset Specification</CardTitle>
      </CardHeader>

      <CardContent>
        <SpecForm />
      </CardContent>
    </Card>
  )
}
