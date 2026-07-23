import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BankForm from "../_components/BankForm"

export default function BankNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Bank</CardTitle>
      </CardHeader>

      <CardContent>
        <BankForm />
      </CardContent>
    </Card>
  )
}
