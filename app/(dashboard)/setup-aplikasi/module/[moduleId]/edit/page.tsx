import { moduleShow } from "@/data/module"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react";
import FormSkeleton from "@/components/form-skeleton";
import ModuleForm from "../../_components/ModuleForm";

type Params = Promise<{ moduleId: string }>;

const RenderForm = async ({ moduleId }: { moduleId: string }) => {
  const data = await moduleShow(moduleId)

  return <ModuleForm data={data} />
}
export default async function ModuleEditPage({ params }: { params: Params }) {
  const { moduleId } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Edit Module</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm moduleId={moduleId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
