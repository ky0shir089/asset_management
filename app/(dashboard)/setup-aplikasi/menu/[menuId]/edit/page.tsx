import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { menuShow } from "@/data/menu"
import { Suspense } from "react"
import MenuForm from "../../_components/MenuForm"
import { moduleOptions } from "@/data/select"

type Params = Promise<{ menuId: string }>

const RenderForm = async ({ menuId }: { menuId: string }) => {
  const [data, modules] = await Promise.all([menuShow(menuId), moduleOptions()])

  return <MenuForm data={data} modules={modules} />
}

export default async function MenuEditPage({ params }: { params: Params }) {
  const { menuId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/setup-aplikasi/menu" />
        <CardTitle className="text-2xl">Edit Menu</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm menuId={menuId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
