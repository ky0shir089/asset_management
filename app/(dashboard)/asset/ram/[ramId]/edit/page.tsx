import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ramShow } from "@/data/ram"
import { Suspense } from "react"
import RamForm from "../../_components/RamForm"

type Params = Promise<{ ramId: string }>

const RenderForm = async ({ ramId }: { ramId: string }) => {
  const data = await ramShow(ramId)

  return <RamForm data={data} />
}

export default async function RamEditPage({ params }: { params: Params }) {
  const { ramId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/ram" />
        <CardTitle className="text-2xl">Edit RAM</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm ramId={ramId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
