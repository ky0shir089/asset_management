import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { rentInvoicePayments } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { readRentPaymentProof } from "@/lib/local-upload"
import { and, eq } from "drizzle-orm"
import { notFound } from "next/navigation"

export const runtime = "nodejs"

type Params = Promise<{ invoiceId: string; paymentId: string }>

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  await requireUser()
  await requirePermission("rent-billing:read")
  const { invoiceId, paymentId } = await params
  const [payment] = await db
    .select({ proofPath: rentInvoicePayments.proofPath })
    .from(rentInvoicePayments)
    .where(
      and(
        eq(rentInvoicePayments.id, paymentId),
        eq(rentInvoicePayments.invoiceId, invoiceId)
      )
    )
    .limit(1)
  if (!payment?.proofPath) notFound()
  const proof = await readRentPaymentProof(payment.proofPath)
  if (!proof) notFound()
  return new Response(new Uint8Array(proof.buffer), {
    headers: {
      "Content-Type": proof.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
