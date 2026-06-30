import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { purchaseRequestShow } from "@/data/purchase-request"
import Link from "next/link"
import PurchaseRequestStatusActions from "../_components/PurchaseRequestStatusActions"

type Params = Promise<{ prId: string }>
type PurchaseRequestDetail = Awaited<
  ReturnType<typeof purchaseRequestShow>
>["details"][number]

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("id-ID")
}

function formatText(value: string | null | undefined) {
  return value?.trim() ? value : "-"
}

function formatAssetCode(detail: PurchaseRequestDetail) {
  return detail.assetCode
    ? `${detail.assetCode.code} - ${detail.assetCode.name}`
    : "-"
}

function formatSpecifications(
  specifications: PurchaseRequestDetail["specifications"]
) {
  if (!specifications.length) {
    return "-"
  }

  return specifications
    .map((specification) => {
      const name = specification.spec?.name ?? "-"
      const value = specification.specValue ?? "-"

      return `${name}: ${value}`
    })
    .join(", ")
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

export default async function PrDetailPage({ params }: { params: Params }) {
  const { prId } = await params
  const data = await purchaseRequestShow(prId)

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">
              Purchase Request Detail
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {formatText(data.description)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/asset-transaction/list-purchase-request"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back
            </Link>
            <PurchaseRequestStatusActions
              id={data.id}
              status={data.status}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Date" value={data.date} />
          <InfoItem label="Company" value={data.company?.code ?? "-"} />
          <InfoItem label="Category" value={data.assetCategory?.name ?? "-"} />
          <InfoItem label="Status" value={data.status} />
          <InfoItem label="Total Qty" value={data.totalQuantity ?? 0} />
          <InfoItem
            label="Total Amount"
            value={formatCurrency(data.totalAmount)}
          />
        </div>

        <div>
          <h3 className="mb-3 font-semibold">Asset Details</h3>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.details.length ? (
                  data.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-medium">
                        {formatAssetCode(detail)}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        {formatSpecifications(detail.specifications)}
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.quantity ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.total)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No asset details.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
