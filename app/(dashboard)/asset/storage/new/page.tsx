import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import StorageForm from "../_components/StorageForm"

export default function StorageNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/storage" />
        <CardTitle className="text-2xl">Create Storage</CardTitle>
      </CardHeader>

      <CardContent>
        <StorageForm />
      </CardContent>
    </Card>
  )
}
