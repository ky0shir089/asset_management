import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  assetCategoryOptions,
  assetCodeOptions,
  assetSpecOptions,
  assetSpecValueOptions,
  companyOptions,
} from "@/data/select"
import { Suspense } from "react"
import PurchaseRequestForm from "../_components/PurchaseRequestForm"

const RenderForm = async () => {
  const [companies, categories, codes, specs, specValues] = await Promise.all([
    companyOptions(),
    assetCategoryOptions(),
    assetCodeOptions(),
    assetSpecOptions(),
    assetSpecValueOptions(),
  ])

  return (
    <PurchaseRequestForm
      companies={companies}
      categories={categories}
      codes={codes}
      specs={specs}
      specValues={specValues}
    />
  )
}

export default function PurchaseRequestNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Create Purchase Request
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
