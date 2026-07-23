import { roleOptions } from "@/data/select"
import { userShow } from "@/data/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"
import FormSkeleton from "@/components/form-skeleton"
import UserForm from "../../_components/UserForm"

type Params = Promise<{ userId: string }>

const RenderForm = async ({ userId }: { userId: string }) => {
  const [data, roles] = await Promise.all([userShow(userId), roleOptions()])

  return <UserForm data={data} roles={roles} />
}
export default async function userEditPage({ params }: { params: Params }) {
  const { userId } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Edit user</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm userId={userId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
