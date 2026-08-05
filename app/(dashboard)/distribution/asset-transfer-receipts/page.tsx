import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { assetTransferReceiptQueue } from "@/data/asset-transfer-receipt"
import AssetTransferReceiptAction from "./_components/AssetTransferReceiptAction"

export default async function AssetTransferReceiptsPage() {
  const transfers = await assetTransferReceiptQueue()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl font-bold">Transfer Receipts</h1>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Confirm assets assigned to you after verifying destination and condition.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-4xl">
            <TableHeader>
              <TableRow>
                <TableHead>Transfer Date</TableHead>
                <TableHead>Lease No</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Assigned User</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length ? (
                transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{transfer.transferDate}</TableCell>
                    <TableCell className="font-medium">
                      {transfer.rentNo ?? "Standalone transfer"}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{transfer.assetNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.assetName}
                      </p>
                    </TableCell>
                    <TableCell>{transfer.outletName}</TableCell>
                    <TableCell>{transfer.assignedUserName}</TableCell>
                    <TableCell>
                      <AssetTransferReceiptAction transfer={transfer} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center">
                    <p className="font-medium">No pending transfer receipts</p>
                    <p className="text-sm text-muted-foreground">
                      New assigned transfers appear here.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
