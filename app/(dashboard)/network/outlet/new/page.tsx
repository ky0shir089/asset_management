import { BackButton } from "@/components/back-button"
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { branchOptions } from "@/data/select"
import { Suspense } from "react"
import OutletForm from "../_components/OutletForm"

const RenderForm = async () => {
  const branches = await branchOptions()

  return <OutletForm branches={branches} />
}

export default function OutletNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/network/outlet" />
        <CardTitle className="text-2xl">Create Outlet</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
