import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UnauthorizedPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Unauthorized</CardTitle>
      </CardHeader>

      <CardContent>
        <p>You don&apos;t have permission to access this page.</p>
      </CardContent>
    </Card>
  )
}
