import { purchaseOrderShow } from "@/data/purchase-order"
import { renderToBuffer } from "@react-pdf/renderer"
import type { DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import PurchaseOrderPdfDocument from "../../_components/PurchaseOrderPdfDocument"

export const runtime = "nodejs"

type Params = Promise<{ purchaseOrderId: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  const { purchaseOrderId } = await params
  const data = await purchaseOrderShow(purchaseOrderId)
  const document = createElement(PurchaseOrderPdfDocument, {
    data,
  }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(document)

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="purchase-order-${purchaseOrderId}.pdf"`,
    },
  })
}
