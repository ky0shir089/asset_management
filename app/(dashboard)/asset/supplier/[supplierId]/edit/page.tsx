import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bankOptions } from "@/data/select"
import { supplierShow } from "@/data/supplier"
import { Suspense } from "react"
import SupplierForm from "../../_components/SupplierForm"

type Params = Promise<{ supplierId: string }>

const RenderForm = async ({ supplierId }: { supplierId: string }) => {
  const [data, banks] = await Promise.all([supplierShow(supplierId), bankOptions()])

  return <SupplierForm data={data} banks={banks} />
}

export default async function SupplierEditPage({ params }: { params: Params }) {
  const { supplierId } = await params

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/supplier" />
        <CardTitle className="text-2xl">Edit Supplier</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm supplierId={supplierId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
