import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  supplierOptions,
  purchaseRequestOptions,
  purchaseRequestDetailOptions,
} from "@/data/select"
import { Suspense } from "react"
import PurchaseOrderForm from "../_components/PurchaseOrderForm"

const RenderForm = async () => {
  const [suppliers, purchaseRequests, purchaseRequestDetails] =
    await Promise.all([
      supplierOptions(),
      purchaseRequestOptions(),
      purchaseRequestDetailOptions(),
    ])
  // console.log(purchaseRequests)

  return (
    <PurchaseOrderForm
      suppliers={suppliers}
      purchaseRequests={purchaseRequests}
      purchaseRequestDetails={purchaseRequestDetails}
    />
  )
}

export default function PurchaseOrderNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Purchase Order</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
