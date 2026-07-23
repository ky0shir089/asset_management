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
import { assetLeaseShow } from "@/data/asset-lease"
import Link from "next/link"

type Params = Promise<{ rentId: string }>
type AssetLease = Awaited<ReturnType<typeof assetLeaseShow>>
type AssetLeaseDetail = AssetLease["details"][number]

const createdAtFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

function formatAsset(detail: AssetLeaseDetail) {
  const assetCode = detail.asset?.poDetail?.prDetail?.assetCode

  return (
    [detail.asset?.nomorAssets, assetCode?.code, assetCode?.name]
      .filter(Boolean)
      .join(" - ") || "-"
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

export default async function AssetLeaseDetailPage({
  params,
}: {
  params: Params
}) {
  const { rentId } = await params
  const data = await assetLeaseShow(rentId)

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-2xl">
            <h1>Asset Lease Detail</h1>
          </CardTitle>

          <Link
            href="/distribution/asset-lease"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem label="Rent No" value={data.rentNo} />
          <InfoItem label="Outlet" value={data.outlet?.name ?? "-"} />
          <InfoItem label="Note" value={data.note ?? "-"} />
          <InfoItem label="Status" value={data.status} />
          <InfoItem
            label="Created At"
            value={createdAtFormatter.format(data.createdAt)}
          />
        </div>

        <section>
          <h2 className="mb-3 font-semibold">Lease Details</h2>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date Start</TableHead>
                  <TableHead>Date End</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.details.length ? (
                  data.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-medium">
                        {formatAsset(detail)}
                      </TableCell>
                      <TableCell>{detail.customer?.name ?? "-"}</TableCell>
                      <TableCell>{detail.dateStart}</TableCell>
                      <TableCell>{detail.dateEnd ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {(detail.amount ?? 0).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No lease details.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
