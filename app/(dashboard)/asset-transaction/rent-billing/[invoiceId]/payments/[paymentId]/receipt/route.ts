import { rentInvoiceReceiptShow } from "@/data/rent-billing"
import { renderToBuffer } from "@react-pdf/renderer"
import type { DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { PaymentReceiptPdfDocument } from "../../../../_components/PaymentReceiptPdfDocument"

export const runtime = "nodejs"

type Params = Promise<{ invoiceId: string; paymentId: string }>

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { invoiceId, paymentId } = await params
  const data = await rentInvoiceReceiptShow(invoiceId, paymentId)
  const document = createElement(PaymentReceiptPdfDocument, {
    invoiceNo: data.invoiceNo,
    companyName: data.companyName,
    period: data.period,
    paidAt: data.paidAt,
    method: data.method,
    amount: data.amount,
    reference: data.reference ?? "—",
  }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(document)
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${data.invoiceNo}-${data.paymentId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
