import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProcessorForm from "../_components/ProcessorForm"

export default function ProcessorNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Processor</CardTitle>
      </CardHeader>

      <CardContent>
        <ProcessorForm />
      </CardContent>
    </Card>
  )
}
