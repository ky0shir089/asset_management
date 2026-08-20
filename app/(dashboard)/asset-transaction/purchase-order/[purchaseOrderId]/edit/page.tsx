import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { purchaseOrderShow } from "@/data/purchase-order"
import {
  supplierOptions,
  purchaseRequestOptions,
  purchaseRequestDetailOptions,
  supplierAccountOptions,
} from "@/data/select"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import PurchaseOrderForm from "../../_components/PurchaseOrderForm"

type Params = Promise<{ purchaseOrderId: string }>

const RenderForm = async ({
  purchaseOrderId,
}: {
  purchaseOrderId: string
}) => {
  const data = await purchaseOrderShow(purchaseOrderId)

  if (data.status !== "NEW") {
    redirect("/asset-transaction/purchase-order")
  }

  const [suppliers, purchaseRequests, purchaseRequestDetails, supplierAccounts] =
    await Promise.all([
      supplierOptions(),
      purchaseRequestOptions(data.prId),
      purchaseRequestDetailOptions(purchaseOrderId),
      supplierAccountOptions(data.supplierId),
    ])

  return (
    <PurchaseOrderForm
      data={data}
      suppliers={suppliers}
      purchaseRequests={purchaseRequests}
      purchaseRequestDetails={purchaseRequestDetails}
      supplierAccounts={supplierAccounts}
    />
  )
}

export default async function PurchaseOrderEditPage({
  params,
}: {
  params: Params
}) {
  const { purchaseOrderId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset-transaction/purchase-order" />
        <CardTitle className="text-2xl">Edit Purchase Order</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm purchaseOrderId={purchaseOrderId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
