import { purchaseOrderShow } from "@/data/purchase-order"
import { readPurchaseOrderAttachment } from "@/lib/local-upload"
import { notFound } from "next/navigation"

export const runtime = "nodejs"

type Params = Promise<{ purchaseOrderId: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  const { purchaseOrderId } = await params
  const purchaseOrder = await purchaseOrderShow(purchaseOrderId)
  if (!purchaseOrder.attachment) notFound()

  const file = await readPurchaseOrderAttachment(
    purchaseOrderId,
    purchaseOrder.attachment
  )
  if (!file) notFound()

  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="purchase-order-${purchaseOrderId}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
