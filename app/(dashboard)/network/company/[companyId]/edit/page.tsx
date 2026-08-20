import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { companyShow } from "@/data/company"
import { Suspense } from "react"
import FormSkeleton from "@/components/form-skeleton"
import CompanyForm from "../../_components/CompanyForm"

type Params = Promise<{ companyId: string }>

const RenderForm = async ({ companyId }: { companyId: string }) => {
  const data = await companyShow(companyId)

  return <CompanyForm data={data} />
}

export default async function CompanyEditPage({ params }: { params: Params }) {
  const { companyId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/network/company" />
        <CardTitle className="text-2xl">Edit Company</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm companyId={companyId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
