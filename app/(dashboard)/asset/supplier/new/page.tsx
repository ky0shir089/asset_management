import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bankOptions } from "@/data/select"
import { Suspense } from "react"
import SupplierForm from "../_components/SupplierForm"

const RenderForm = async () => {
  const banks = await bankOptions()

  return <SupplierForm banks={banks} />
}

export default function SupplierNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/supplier" />
        <CardTitle className="text-2xl">Create Supplier</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
