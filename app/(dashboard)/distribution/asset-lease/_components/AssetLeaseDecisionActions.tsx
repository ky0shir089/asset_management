"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  assetLeaseApproveSchema,
  assetLeaseRejectSchema,
} from "@/lib/formSchemas/asset-lease-schema"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { assetLeaseApprove, assetLeaseReject } from "../action"

interface AssetLeaseDecisionActionsProps {
  id: string
  status: string
  rentDate: string
  defaultReceiveDate: string
}

export default function AssetLeaseDecisionActions({
  id,
  status,
  rentDate,
  defaultReceiveDate,
}: AssetLeaseDecisionActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [receiveDate, setReceiveDate] = useState(defaultReceiveDate)
  const [reason, setReason] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)

  if (status !== "NEW") return null

  function approve() {
    const validation = assetLeaseApproveSchema.safeParse({
      id,
      rentDate,
      receiveDate,
    })
    if (!validation.success) {
      setFieldError(
        validation.error.issues[0]?.message ?? "Invalid receive date"
      )
      return
    }

    setFieldError(null)
    startTransition(async () => {
      try {
        const result = await assetLeaseApprove(id, receiveDate)
        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        setApproveOpen(false)
        requestAnimationFrame(() =>
          document.getElementById("asset-lease-detail-title")?.focus()
        )
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        )
      }
    })
  }

  function reject() {
    const validation = assetLeaseRejectSchema.safeParse({ id, reason })
    if (!validation.success) {
      setFieldError(validation.error.issues[0]?.message ?? "Invalid rejection")
      return
    }

    setFieldError(null)
    startTransition(async () => {
      try {
        const result = await assetLeaseReject(id, validation.data.reason)
        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        setReason("")
        setRejectOpen(false)
        requestAnimationFrame(() =>
          document.getElementById("asset-lease-detail-title")?.focus()
        )
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        )
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (isPending && !open) return
          if (open) setFieldError(null)
          setRejectOpen(open)
        }}
      >
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
            />
          }
        >
          Reject
        </DialogTrigger>
        <DialogContent showCloseButton={!isPending}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              reject()
            }}
            className="contents"
            aria-busy={isPending}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Reject asset lease</DialogTitle>
              <DialogDescription>
                Enter reason for rejecting this asset lease.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="asset-lease-rejection-reason">
                Rejection reason
              </Label>
              <Textarea
                id="asset-lease-rejection-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setFieldError(null)
                }}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={
                  fieldError
                    ? "asset-lease-rejection-error asset-lease-rejection-count"
                    : "asset-lease-rejection-count"
                }
                maxLength={255}
                disabled={isPending}
                required
              />
              <div className="flex justify-between gap-2 text-sm">
                <p
                  id="asset-lease-rejection-error"
                  className="text-destructive"
                  role={fieldError ? "alert" : undefined}
                >
                  {fieldError ?? ""}
                </p>
                <p
                  id="asset-lease-rejection-count"
                  className="text-muted-foreground"
                >
                  {reason.length}/255
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? "Rejecting…" : "Reject"}
              </Button>
              {isPending && (
                <span className="sr-only" role="status">
                  Rejecting asset lease
                </span>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (isPending && !open) return
          if (open) setFieldError(null)
          setApproveOpen(open)
        }}
      >
        <DialogTrigger
          render={<Button type="button" size="sm" disabled={isPending} />}
        >
          Approve
        </DialogTrigger>
        <DialogContent showCloseButton={!isPending}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              approve()
            }}
            className="contents"
            aria-busy={isPending}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Approve asset lease</DialogTitle>
              <DialogDescription>
                Confirm receive date for this asset lease.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="asset-lease-receive-date">Receive date</Label>
              <Input
                id="asset-lease-receive-date"
                type="date"
                min={rentDate}
                value={receiveDate}
                onChange={(event) => {
                  setReceiveDate(event.target.value)
                  setFieldError(null)
                }}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={
                  fieldError ? "asset-lease-receive-date-error" : undefined
                }
                disabled={isPending}
                required
              />
              {fieldError && (
                <p
                  id="asset-lease-receive-date-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {fieldError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setApproveOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Approving…" : "Approve"}
              </Button>
              {isPending && (
                <span className="sr-only" role="status">
                  Approving asset lease
                </span>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
