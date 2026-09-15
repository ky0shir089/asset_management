import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { storageShow } from "@/data/storage"
import { Suspense } from "react"
import StorageForm from "../../_components/StorageForm"

type Params = Promise<{ storageId: string }>

const RenderForm = async ({ storageId }: { storageId: string }) => {
  const data = await storageShow(storageId)

  return <StorageForm data={data} />
}

export default async function StorageEditPage({ params }: { params: Params }) {
  const { storageId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/storage" />
        <CardTitle className="text-2xl">Edit Storage</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm storageId={storageId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
