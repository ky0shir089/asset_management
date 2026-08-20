import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"
import MenuForm from "../_components/MenuForm"
import { moduleOptions } from "@/data/select"

const RenderForm = async () => {
  const modules = await moduleOptions()

  return <MenuForm modules={modules} />
}

export default function MenuNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/setup-aplikasi/menu" />
        <CardTitle className="text-2xl">Create Menu</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
