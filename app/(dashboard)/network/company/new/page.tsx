import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CompanyForm from "../_components/CompanyForm"

export default function CompanyNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Company</CardTitle>
      </CardHeader>

      <CardContent>
        <CompanyForm />
      </CardContent>
    </Card>
  )
}
