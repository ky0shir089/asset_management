import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assetSpecShow } from "@/data/asset-spec"
import { Suspense } from "react"
import SpecForm from "../../_components/SpecForm"

type Params = Promise<{ specId: string }>

const RenderForm = async ({ specId }: { specId: string }) => {
  const data = await assetSpecShow(specId)

  return <SpecForm data={data} />
}

export default async function AssetSpecEditPage({
  params,
}: {
  params: Params
}) {
  const { specId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/specification" />
        <CardTitle className="text-2xl">
          Edit Asset Specification
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm specId={specId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
