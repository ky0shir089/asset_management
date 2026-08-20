import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BankForm from "../_components/BankForm"

export default function BankNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/asset/bank" />
        <CardTitle className="text-2xl">Create Bank</CardTitle>
      </CardHeader>

      <CardContent>
        <BankForm />
      </CardContent>
    </Card>
  )
}
