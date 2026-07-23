import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { purchaseRequestShow } from "@/data/purchase-request"
import {
  assetCategoryOptions,
  assetCodeOptions,
  assetSpecOptions,
  assetSpecValueOptions,
  companyOptions,
} from "@/data/select"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import PurchaseRequestForm from "../../_components/PurchaseRequestForm"

type Params = Promise<{ purchaseRequestId: string }>

const RenderForm = async ({
  purchaseRequestId,
}: {
  purchaseRequestId: string
}) => {
  const [data, companies, categories, codes, specs, specValues] =
    await Promise.all([
      purchaseRequestShow(purchaseRequestId),
      companyOptions(),
      assetCategoryOptions(),
      assetCodeOptions(),
      assetSpecOptions(),
      assetSpecValueOptions(),
    ])

  if (data.status !== "REQUEST") {
    redirect("/asset/purchase-request")
  }

  return (
    <PurchaseRequestForm
      data={data}
      companies={companies}
      categories={categories}
      codes={codes}
      specs={specs}
      specValues={specValues}
    />
  )
}

export default async function PurchaseRequestEditPage({
  params,
}: {
  params: Params
}) {
  const { purchaseRequestId } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Edit Purchase Request
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm purchaseRequestId={purchaseRequestId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
