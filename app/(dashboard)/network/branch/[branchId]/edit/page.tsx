import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { branchShow } from "@/data/branch"
import { companyOptions } from "@/data/select"
import { Suspense } from "react"
import BranchForm from "../../_components/BranchForm"

type Params = Promise<{ branchId: string }>

const RenderForm = async ({ branchId }: { branchId: string }) => {
  const [data, companies] = await Promise.all([branchShow(branchId), companyOptions()])

  return <BranchForm data={data} companies={companies} />
}

export default async function BranchEditPage({ params }: { params: Params }) {
  const { branchId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/network/branch" />
        <CardTitle className="text-2xl">Edit Branch</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm branchId={branchId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
