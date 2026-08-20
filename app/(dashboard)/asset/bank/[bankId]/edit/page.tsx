import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bankShow } from "@/data/bank"
import { Suspense } from "react"
import BankForm from "../../_components/BankForm"

type Params = Promise<{ bankId: string }>

const RenderForm = async ({ bankId }: { bankId: string }) => {
  const data = await bankShow(bankId)

  return <BankForm data={data} />
}

export default async function BankEditPage({ params }: { params: Params }) {
  const { bankId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/bank" />
        <CardTitle className="text-2xl">Edit Bank</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm bankId={bankId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
