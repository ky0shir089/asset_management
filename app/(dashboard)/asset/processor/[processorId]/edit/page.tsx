import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { processorShow } from "@/data/processor"
import { Suspense } from "react"
import ProcessorForm from "../../_components/ProcessorForm"

type Params = Promise<{ processorId: string }>

const RenderForm = async ({ processorId }: { processorId: string }) => {
  const data = await processorShow(processorId)

  return <ProcessorForm data={data} />
}

export default async function ProcessorEditPage({
  params,
}: {
  params: Params
}) {
  const { processorId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/processor" />
        <CardTitle className="text-2xl">Edit Processor</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm processorId={processorId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
