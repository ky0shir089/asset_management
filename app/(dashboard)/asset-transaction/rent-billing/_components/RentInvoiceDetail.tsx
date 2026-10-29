"use client"

import { BackButton } from "@/components/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { rentInvoiceDetail } from "@/data/rent-billing"
import { NumericFormat } from "react-number-format"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  rentInvoiceCancel,
  rentInvoiceIssue,
  rentInvoiceRecordPayment,
  rentInvoiceUpdateDraft,
} from "../action"

type Invoice = NonNullable<rentInvoiceDetail>
type DraftItem = Invoice["items"][number]
const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00Z`))

export function RentInvoiceDetail({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<DraftItem[]>(invoice.items)
  const [vatRate, setVatRate] = useState(invoice.vatRate)
  const [withholdingRate, setWithholdingRate] = useState(
    invoice.withholdingRate
  )
  const [depositDeduction, setDepositDeduction] = useState(
    invoice.depositDeduction
  )
  const [dueDate, setDueDate] = useState(invoice.dueDate)
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<
    "BANK_TRANSFER" | "CASH" | "OTHER"
  >("BANK_TRANSFER")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofError, setPaymentProofError] = useState("")
  const [proofPreview, setProofPreview] = useState<{
    url: string
    name: string
  } | null>(null)
  const paymentProofInput = useRef<HTMLInputElement>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [additionalDescription, setAdditionalDescription] = useState("")
  const [additionalAmount, setAdditionalAmount] = useState("")
  const canEdit = invoice.canEdit && invoice.status === "DRAFT"
  const subtotal = items.reduce(
    (total, item) => total + item.quantity * item.unitAmount,
    0
  )
  const vatAmount = Math.round((subtotal * Number(vatRate || 0)) / 100)
  const withholdingAmount = Math.round(
    (subtotal * Number(withholdingRate || 0)) / 100
  )
  const appliedDeposit = Math.min(
    Number(depositDeduction || 0),
    subtotal + vatAmount - withholdingAmount
  )
  const total = subtotal + vatAmount - withholdingAmount - appliedDeposit

  function run(
    action: () => Promise<{ success: boolean; message: string }>,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      onSuccess?.()
      router.refresh()
    })
  }

  function handlePaymentProof(file: File | null) {
    setPaymentProofError("")
    if (!file) {
      setPaymentProof(null)
      return
    }
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ])
    if (!allowedTypes.has(file.type) || file.size > 1_048_576) {
      setPaymentProof(null)
      setPaymentProofError("Choose JPEG, PNG, WebP, or PDF under 1 MB.")
      return
    }
    setPaymentProof(file)
  }

  function addAdditionalItem() {
    const description = additionalDescription.trim()
    const amount = Number(additionalAmount)
    if (!description || !Number.isSafeInteger(amount) || amount <= 0) {
      toast.error("Enter item description and a positive amount")
      return
    }
    setItems((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        billingTiming: null,
        rentDetailId: null,
        assetId: null,
        assetNumber: null,
        description,
        itemType: "ADDITIONAL",
        quantity: 1,
        unitAmount: amount,
        amount,
      },
    ])
    setAdditionalDescription("")
    setAdditionalAmount("")
  }

  function draftInput() {
    return {
      dueDate,
      vatRate: Number(vatRate),
      withholdingRate: Number(withholdingRate),
      depositDeduction: Number(depositDeduction),
      items: items.map(
        ({
          id,
          description,
          itemType,
          billingTiming,
          rentDetailId,
          assetId,
          quantity,
          unitAmount,
        }) => ({
          id: id.startsWith("new-") ? undefined : id,
          description,
          itemType,
          billingTiming: itemType === "RENT" ? billingTiming : null,
          rentDetailId,
          assetId,
          quantity,
          unitAmount,
        })
      ),
    }
  }

  function saveDraft() {
    run(() => rentInvoiceUpdateDraft(invoice.id, draftInput()))
  }

  function issueInvoice() {
    run(async () => {
      const saved = await rentInvoiceUpdateDraft(invoice.id, draftInput())
      if (!saved.success) return saved
      return rentInvoiceIssue(invoice.id)
    })
  }

  const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    ISSUED: "Issued",
    OVERDUE: "Overdue",
    PARTIALLY_PAID: "Partially paid",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  }
  const statusBadgeClasses: Record<string, string> = {
    DRAFT: "border-border bg-muted text-foreground",
    ISSUED:
      "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    OVERDUE:
      "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
    PARTIALLY_PAID:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
    PAID:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    CANCELLED:
      "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  }

  return (
    <main
      className="mx-auto w-full max-w-7xl space-y-5"
      aria-labelledby="invoice-title"
    >
      <div className="flex">
        <BackButton href="/asset-transaction/rent-billing" />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Rent invoice · {invoice.companyName}
          </p>
          <h1
            id="invoice-title"
            className="mt-1 text-2xl font-semibold tracking-tight wrap-break-word"
          >
            {invoice.invoiceNo ?? `Draft ${invoice.id}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateLabel(invoice.periodStart)} – {dateLabel(invoice.periodEnd)} ·
            Due {dateLabel(invoice.dueDate)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            statusBadgeClasses[invoice.paymentStatus] ??
            "border-border bg-muted text-muted-foreground"
          }
        >
          {statusLabels[invoice.paymentStatus] ?? invoice.paymentStatus}
        </Badge>
      </header>

      {invoice.status === "CANCELLED" && invoice.cancelReason && (
        <section
          className="space-y-1 rounded-lg border p-4"
          aria-labelledby="cancellation-reason-heading"
        >
          <h2 id="cancellation-reason-heading" className="font-semibold">
            Cancellation reason
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {invoice.cancelReason}
          </p>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="invoice-items-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="invoice-items-heading" className="text-lg font-semibold">
              Invoice items
            </h2>
            <p className="text-sm text-muted-foreground">
              Lease rates and adjustments for this billing period.
            </p>
          </div>
          {canEdit && (
            <Button onClick={saveDraft} disabled={isPending}>
              Save draft
            </Button>
          )}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canEdit && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{item.assetNumber ?? "—"}</TableCell>
                  <TableCell className="min-w-52 whitespace-normal">
                    {canEdit && item.itemType === "ADDITIONAL" ? (
                      <Input
                        aria-label="Additional item description"
                        value={item.description}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((line, lineIndex) =>
                              lineIndex === index
                                ? { ...line, description: event.target.value }
                                : line
                            )
                          )
                        }
                      />
                    ) : (
                      item.description
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit && item.itemType === "RENT" ? (
                      <Select
                        value={item.billingTiming ?? "IN_ADVANCE"}
                        onValueChange={(value) =>
                          setItems((current) =>
                            current.map((line, lineIndex) =>
                              lineIndex === index
                                ? {
                                    ...line,
                                    billingTiming: value as
                                      | "IN_ADVANCE"
                                      | "IN_ARREARS",
                                  }
                                : line
                            )
                          )
                        }
                      >
                        <SelectTrigger
                          aria-label="Billing timing"
                          className="w-36"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IN_ADVANCE">In advance</SelectItem>
                          <SelectItem value="IN_ARREARS">In arrears</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : item.billingTiming === "IN_ARREARS" ? (
                      "In arrears"
                    ) : item.billingTiming === "IN_ADVANCE" ? (
                      "In advance"
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {canEdit && item.itemType === "ADDITIONAL" ? (
                      <NumericFormat
                        customInput={Input}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={0}
                        allowNegative={false}
                        isAllowed={({ floatValue }) =>
                          floatValue === undefined ||
                          floatValue <= 2_000_000_000
                        }
                        aria-label="Additional item amount"
                        className="min-w-32 text-right"
                        value={item.unitAmount}
                        onValueChange={({ floatValue }) =>
                          setItems((current) =>
                            current.map((line, lineIndex) =>
                              lineIndex === index
                                ? {
                                    ...line,
                                    unitAmount: floatValue ?? 0,
                                    amount: floatValue ?? 0,
                                  }
                                : line
                            )
                          )
                        }
                      />
                    ) : (
                      money.format(item.unitAmount)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money.format(item.quantity * item.unitAmount)}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      {item.itemType !== "RENT" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setItems((current) =>
                              current.filter(
                                (_, lineIndex) => lineIndex !== index
                              )
                            )
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {canEdit && (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="additional-description">Additional charge</Label>
              <Input
                id="additional-description"
                value={additionalDescription}
                onChange={(event) =>
                  setAdditionalDescription(event.target.value)
                }
                placeholder="Repair, late fee…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-amount">Amount (IDR)</Label>
              <NumericFormat
                id="additional-amount"
                customInput={Input}
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={0}
                allowNegative={false}
                isAllowed={({ floatValue }) =>
                  floatValue === undefined || floatValue <= 2_000_000_000
                }
                value={additionalAmount}
                onValueChange={({ value }) => setAdditionalAmount(value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={addAdditionalItem}>
              Add item
            </Button>
          </div>
        )}
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {canEdit && (
          <div className="space-y-4 rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Billing terms</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-due-date">Due date</Label>
                <Input
                  id="invoice-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-vat-rate">PPN (%)</Label>
                <NumericFormat
                  id="invoice-vat-rate"
                  customInput={Input}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={0}
                  allowNegative={false}
                  isAllowed={({ floatValue }) =>
                    floatValue === undefined || floatValue <= 100
                  }
                  value={vatRate}
                  onValueChange={({ floatValue }) =>
                    setVatRate(floatValue ?? 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-withholding-rate">
                  PPh withholding (%)
                </Label>
                <NumericFormat
                  id="invoice-withholding-rate"
                  customInput={Input}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={0}
                  allowNegative={false}
                  isAllowed={({ floatValue }) =>
                    floatValue === undefined || floatValue <= 100
                  }
                  value={withholdingRate}
                  onValueChange={({ floatValue }) =>
                    setWithholdingRate(floatValue ?? 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-deposit">Deposit deduction (IDR)</Label>
                <NumericFormat
                  id="invoice-deposit"
                  customInput={Input}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={0}
                  allowNegative={false}
                  value={depositDeduction}
                  onValueChange={({ floatValue }) =>
                    setDepositDeduction(floatValue ?? 0)
                  }
                />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3 rounded-lg border p-4 lg:col-start-2 lg:row-start-1">
          <h2 className="text-lg font-semibold">Invoice total</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{money.format(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>PPN ({vatRate}%)</dt>
              <dd className="tabular-nums">{money.format(vatAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>PPh withholding ({withholdingRate}%)</dt>
              <dd className="tabular-nums">
                {money.format(withholdingAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Deposit deduction</dt>
              <dd className="tabular-nums">−{money.format(appliedDeposit)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-3 text-base font-semibold">
              <dt>Grand total</dt>
              <dd className="tabular-nums">{money.format(total)}</dd>
            </div>
            {invoice.status !== "DRAFT" && (
              <>
                <div className="flex justify-between gap-3">
                  <dt>Paid</dt>
                  <dd className="tabular-nums">
                    {money.format(invoice.paidAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 font-medium">
                  <dt>Balance</dt>
                  <dd className="tabular-nums">
                    {money.format(invoice.balance)}
                  </dd>
                </div>
              </>
            )}
          </dl>
          {invoice.status === "DRAFT" && invoice.canEdit && (
            <Button
              className="w-full"
              onClick={issueInvoice}
              disabled={isPending}
            >
              Issue invoice
            </Button>
          )}
          {invoice.status === "ISSUED" &&
            invoice.canEdit &&
            invoice.balance > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-medium">Record payment</h3>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paidAt}
                    onChange={(event) => setPaidAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) =>
                      setPaymentMethod(value as typeof paymentMethod)
                    }
                  >
                    <SelectTrigger id="payment-method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">
                        Bank transfer
                      </SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Amount (IDR)</Label>
                  <NumericFormat
                    id="payment-amount"
                    customInput={Input}
                    thousandSeparator="."
                    decimalSeparator=","
                    decimalScale={0}
                    allowNegative={false}
                    isAllowed={({ floatValue }) =>
                      floatValue === undefined || floatValue <= invoice.balance
                    }
                    value={paymentAmount}
                    onValueChange={({ value }) => setPaymentAmount(value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-reference">
                    Transaction reference
                  </Label>
                  <Input
                    id="payment-reference"
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-proof">
                    Payment proof (optional, max 1 MB)
                  </Label>
                  <Input
                    ref={paymentProofInput}
                    id="payment-proof"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    aria-invalid={!!paymentProofError}
                    aria-describedby={
                      paymentProofError ? "payment-proof-error" : undefined
                    }
                    onChange={(event) =>
                      handlePaymentProof(event.target.files?.[0] ?? null)
                    }
                  />
                  {paymentProofError && (
                    <p
                      id="payment-proof-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {paymentProofError}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  disabled={isPending || !paymentAmount}
                  onClick={() =>
                    run(
                      () => {
                        const formData = new FormData()
                        formData.set("invoiceId", invoice.id)
                        formData.set("paidAt", paidAt)
                        formData.set("method", paymentMethod)
                        formData.set("amount", paymentAmount)
                        formData.set("reference", paymentReference)
                        if (paymentProof) formData.set("proof", paymentProof)
                        return rentInvoiceRecordPayment(formData)
                      },
                      () => {
                        setPaymentAmount("")
                        setPaymentMethod("BANK_TRANSFER")
                        setPaymentReference("")
                        setPaymentProof(null)
                        setPaymentProofError("")
                        if (paymentProofInput.current)
                          paymentProofInput.current.value = ""
                      }
                    )
                  }
                >
                  Record payment
                </Button>
              </div>
            )}
          {invoice.canEdit &&
            (invoice.status === "ISSUED" || invoice.status === "DRAFT") &&
            invoice.paidAmount === 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="cancel-reason">Cancellation reason</Label>
                <Input
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Reason required for audit"
                />
                <Button
                  variant="destructive"
                  disabled={isPending || !cancelReason.trim()}
                  onClick={() =>
                    run(() =>
                      rentInvoiceCancel({
                        invoiceId: invoice.id,
                        reason: cancelReason,
                      })
                    )
                  }
                >
                  Cancel invoice
                </Button>
              </div>
            )}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="payment-history-heading">
        <h2 id="payment-history-heading" className="text-lg font-semibold">
          Payment history
        </h2>
        {invoice.payments.length ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{dateLabel(payment.paidAt)}</TableCell>
                    <TableCell>{payment.method.replaceAll("_", " ")}</TableCell>
                    <TableCell>{payment.reference ?? "—"}</TableCell>
                    <TableCell>
                      {payment.proofPath ? (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() =>
                            setProofPreview({
                              url: `/asset-transaction/rent-billing/${invoice.id}/payments/${payment.id}/proof`,
                              name: payment.proofName ?? "Payment proof",
                            })
                          }
                        >
                          {payment.proofName ?? "View proof"}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/asset-transaction/rent-billing/${invoice.id}/payments/${payment.id}/receipt`}
                        className="underline underline-offset-4"
                      >
                        Download receipt
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money.format(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            No payments recorded. Payments will appear here after billing admin
            records them.
          </p>
        )}
      </section>

      <Dialog
        open={proofPreview !== null}
        onOpenChange={(open) => {
          if (!open) setProofPreview(null)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogTitle className="pr-10">{proofPreview?.name}</DialogTitle>
          {proofPreview &&
            (proofPreview.name.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={proofPreview.url}
                title={proofPreview.name}
                className="h-[70dvh] w-full rounded-md border"
              />
            ) : (
              <Image
                src={proofPreview.url}
                alt={proofPreview.name}
                width={1200}
                height={900}
                unoptimized
                className="max-h-[70dvh] w-full rounded-md object-contain"
              />
            ))}
        </DialogContent>
      </Dialog>

      <section className="space-y-3" aria-labelledby="invoice-audit-heading">
        <h2 id="invoice-audit-heading" className="text-lg font-semibold">
          Activity history
        </h2>
        {invoice.events.length ? (
          <ol className="space-y-2">
            {invoice.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"
              >
                <span className="font-medium">
                  {event.action.replaceAll("_", " ")} · {event.userName}
                </span>
                <time
                  dateTime={event.createdAt.toISOString()}
                  className="text-muted-foreground"
                >
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  }).format(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No activity recorded.</p>
        )}
      </section>
    </main>
  )
}
