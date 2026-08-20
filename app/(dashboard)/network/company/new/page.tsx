import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CompanyForm from "../_components/CompanyForm"

export default function CompanyNewPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <BackButton href="/network/company" />
        <CardTitle className="text-2xl">Create Company</CardTitle>
      </CardHeader>

      <CardContent>
        <CompanyForm />
      </CardContent>
    </Card>
  )
}
