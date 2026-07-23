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
      <CardHeader>
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
