import { assetTransferShow } from "@/data/asset-transfer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Calendar, Building2, User, FileText, Hash } from "lucide-react"
import { BackButton } from "@/components/back-button"

const statusClasses: Record<string, string> = {
  PENDING:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  RECEIVED:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
}

export default async function AssetTransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>
}) {
  const { transferId } = await params
  const data = await assetTransferShow(transferId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackButton href="/distribution/asset-transfer" />
          <h1 className="text-3xl font-bold">Transfer Details</h1>
        </div>
        <Badge
          variant="outline"
          className={cn(statusClasses[data.status] ?? "border-border bg-muted text-muted-foreground")}
        >
          {data.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-muted-foreground" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground">Asset Number</div>
              <div className="col-span-2 font-medium">{data.assetNumber}</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground">Asset Code</div>
              <div className="col-span-2">{data.assetCode}</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground">Asset Name</div>
              <div className="col-span-2">{data.assetName}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground">Company</div>
              <div className="col-span-2">
                {data.companyCode} - {data.companyName}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground">Outlet</div>
              <div className="col-span-2 font-medium">{data.outletName}</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned User
              </div>
              <div className="col-span-2">{data.userName}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Transfer Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Transfer Date
              </div>
              <div className="md:col-span-3 font-medium">{data.transferDate}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
