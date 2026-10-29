import { BackButton } from "@/components/back-button"
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

  // Filter to PO details with remaining quantity and PV number
  const availablePoDetails = poDetails.filter(
    (d) => d.remainingQuantity > 0 && d.pvNo?.trim()
  )

  return <ReceivedAssetForm poDetails={availablePoDetails} outlets={outlets} />
}

export default function ReceivedAssetNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset-transaction/received-asset" />
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
