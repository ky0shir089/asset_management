import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { roleShow } from "@/data/role"
import { Suspense } from "react"
import RoleForm from "../../_components/RoleForm"
import { menuOptions } from "@/data/select"

type Params = Promise<{ roleId: string }>

const RenderForm = async ({ roleId }: { roleId: string }) => {
  const [data, menus] = await Promise.all([roleShow(roleId), menuOptions()])

  return <RoleForm data={data} menus={menus} />
}

export default async function RoleEditPage({ params }: { params: Params }) {
  const { roleId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/setup-aplikasi/role" />
        <CardTitle className="text-2xl">Edit Role</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm roleId={roleId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
