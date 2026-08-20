import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProcessorForm from "../_components/ProcessorForm"

export default function ProcessorNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/processor" />
        <CardTitle className="text-2xl">Create Processor</CardTitle>
      </CardHeader>

      <CardContent>
        <ProcessorForm />
      </CardContent>
    </Card>
  )
}
