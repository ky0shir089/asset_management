import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"
import RoleForm from "../_components/RoleForm"
import { menuOptions } from "@/data/select"

const RenderForm = async () => {
  const menus = await menuOptions()

  return <RoleForm menus={menus} />
}

export default function RoleNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/setup-aplikasi/role" />
        <CardTitle className="text-2xl">Create Role</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
