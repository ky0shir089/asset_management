import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { companyOptions } from "@/data/select"
import { Suspense } from "react"
import BranchForm from "../_components/BranchForm"

const RenderForm = async () => {
  const companies = await companyOptions()

  return <BranchForm companies={companies} />
}

export default function BranchNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Branch</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
