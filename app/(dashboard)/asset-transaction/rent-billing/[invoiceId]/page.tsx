import { requirePermission } from "@/lib/auth/permission"
import { rentInvoiceShow } from "@/data/rent-billing"
import { RentInvoiceDetail } from "../_components/RentInvoiceDetail"

export default async function RentInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  await requirePermission("rent-billing:read")
  const { invoiceId } = await params
  const invoice = await rentInvoiceShow(invoiceId)
  return <RentInvoiceDetail invoice={invoice} />
}
