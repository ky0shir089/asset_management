import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  outletOptions,
  purchaseOrderDetailOptionsForReceivedAsset,
} from "@/data/select"
import { Suspense } from "react"
import ReceivedAssetForm from "../_components/ReceivedAssetForm"

const RenderForm = async () => {
  const [poDetails, outlets] = await Promise.all([
    purchaseOrderDetailOptionsForReceivedAsset(),
    outletOptions(),
  ])

  // Filter to PO details with remaining quantity > 0
  const availablePoDetails = poDetails.filter((d) => d.remainingQuantity > 0)

  return (
    <ReceivedAssetForm
      poDetails={availablePoDetails}
      outlets={outlets}
    />
  )
}

export default function ReceivedAssetNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Receive Asset</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
