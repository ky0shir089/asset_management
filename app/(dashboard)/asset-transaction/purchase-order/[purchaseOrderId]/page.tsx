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
import { purchaseOrderShow } from "@/data/purchase-order"
import Link from "next/link"
import PurchaseOrderPdfDownloadButton from "../_components/PurchaseOrderPdfDownloadButton"

type Params = Promise<{ purchaseOrderId: string }>
type PurchaseOrder = Awaited<ReturnType<typeof purchaseOrderShow>>
type PurchaseOrderDetail = PurchaseOrder["details"][number]

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("id-ID")
}

function formatPurchaseRequest(
  purchaseRequest: PurchaseOrder["purchaseRequest"]
) {
  if (!purchaseRequest) {
    return "-"
  }

  return `${purchaseRequest.prNo}`
}

function formatAssetCode(detail: PurchaseOrderDetail) {
  const assetCode = detail.prDetail?.assetCode

  return assetCode ? `${assetCode.code} - ${assetCode.name}` : "-"
}

function formatSpecifications(detail: PurchaseOrderDetail) {
  const specifications = detail.prDetail?.specifications ?? []

  if (!specifications.length) {
    return "-"
  }

  return specifications.map((specification) => {
    const name = specification.spec?.name ?? "-"
    const value = specification.specValue ?? "-"

    return (
      <li key={specification.id}>
        {name}: {value}
      </li>
    )
  })
}

function calculateSubtotal(details: PurchaseOrderDetail[]) {
  return details.reduce((sum, detail) => sum + Number(detail.total ?? 0), 0)
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Params
}) {
  const { purchaseOrderId } = await params
  const data = await purchaseOrderShow(purchaseOrderId)
  const subtotal = calculateSubtotal(data.details)
  const shippingCost = Number(data.shippingCost ?? 0)
  const grandTotal = subtotal + shippingCost

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-2xl">Purchase Order Detail</CardTitle>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/asset-transaction/purchase-order"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back
            </Link>
            <PurchaseOrderPdfDownloadButton purchaseOrderId={purchaseOrderId} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Date" value={data.date} />
          <InfoItem label="Supplier" value={data.supplier?.name ?? "-"} />
          <InfoItem
            label="Purchase Request"
            value={formatPurchaseRequest(data.purchaseRequest)}
          />
          <InfoItem label="Status" value={data.status} />
          <InfoItem label="Description" value={data.description} />
          <InfoItem
            label="Shipping Cost"
            value={formatCurrency(shippingCost)}
          />
          <InfoItem label="Subtotal" value={formatCurrency(subtotal)} />
          <InfoItem label="Grand Total" value={formatCurrency(grandTotal)} />
        </div>

        <div>
          <h3 className="mb-3 font-semibold">Order Details</h3>
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
                      <TableCell className="max-w-90">
                        <ul>{formatSpecifications(detail)}</ul>
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
                      No order details.
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
