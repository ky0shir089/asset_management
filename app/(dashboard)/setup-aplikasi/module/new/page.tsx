import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ModuleForm from "../_components/ModuleForm"

export default function ModuleNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/setup-aplikasi/module" />
        <CardTitle className="text-2xl">Create Module</CardTitle>
      </CardHeader>

      <CardContent>
        <ModuleForm />
      </CardContent>
    </Card>
  )
}
