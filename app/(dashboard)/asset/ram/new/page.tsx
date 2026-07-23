import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RamForm from "../_components/RamForm"

export default function RamNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create RAM</CardTitle>
      </CardHeader>

      <CardContent>
        <RamForm />
      </CardContent>
    </Card>
  )
}
