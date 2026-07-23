import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ModuleForm from "../_components/ModuleForm"

export default function ModuleNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Module</CardTitle>
      </CardHeader>

      <CardContent>
        <ModuleForm />
      </CardContent>
    </Card>
  )
}
