import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RamForm from "../_components/RamForm"

export default function RamNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/ram" />
        <CardTitle className="text-2xl">Create RAM</CardTitle>
      </CardHeader>

      <CardContent>
        <RamForm />
      </CardContent>
    </Card>
  )
}
