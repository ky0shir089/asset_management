import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AssetMaintenanceDetail } from "@/data/maintenance"
import { CalendarDays } from "lucide-react"

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00Z`))

type BillingHistory = AssetMaintenanceDetail["billingHistory"]

export function AssetBillingHistory({
  billingHistory,
}: {
  billingHistory: BillingHistory
}) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    ISSUED: "Issued",
    PAID: "Paid",
    PARTIALLY_PAID: "Partially paid",
    OVERDUE: "Overdue",
    CANCELLED: "Cancelled",
  }
  return (
    <Card aria-labelledby="asset-billing-history-title">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <CalendarDays className="size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>
              <h2 id="asset-billing-history-title">Billing history</h2>
            </CardTitle>
            <CardDescription>
              Invoices and rental charges linked to this asset ({billingHistory.length}).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {billingHistory.length ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rent amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium tabular-nums">
                      {row.invoiceNo ?? `Draft ${row.invoiceId}`}
                    </TableCell>
                    <TableCell>{row.companyName}</TableCell>
                    <TableCell>{dateLabel(row.periodStart)}</TableCell>
                    <TableCell className="tabular-nums">
                      {money.format(row.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "OVERDUE" ? "destructive" : "secondary"}>
                        {labels[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.paidAt
                        ? new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(`${row.paidAt}T00:00:00Z`))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            No issued invoices linked to this asset yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
