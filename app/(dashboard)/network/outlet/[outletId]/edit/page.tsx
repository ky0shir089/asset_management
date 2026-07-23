import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { outletShow } from "@/data/outlet"
import { branchOptions } from "@/data/select"
import { Suspense } from "react"
import OutletForm from "../../_components/OutletForm"

type Params = Promise<{ outletId: string }>

const RenderForm = async ({ outletId }: { outletId: string }) => {
  const [data, branches] = await Promise.all([outletShow(outletId), branchOptions()])

  return <OutletForm data={data} branches={branches} />
}

export default async function OutletEditPage({ params }: { params: Params }) {
  const { outletId } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Edit Outlet</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm outletId={outletId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
