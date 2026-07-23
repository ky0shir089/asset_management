"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { purchaseRequestApprove, purchaseRequestReject } from "../action"

interface PurchaseRequestStatusActionsProps {
  id: string
  status: string
}

export default function PurchaseRequestStatusActions({
  id,
  status,
}: PurchaseRequestStatusActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)

  if (status !== "REQUEST") {
    return null
  }

  function approve() {
    startTransition(async () => {
      const result = await purchaseRequestApprove(id)

      if (result.success) {
        toast.success(result.message)
        router.push("/asset-transaction/list-purchase-request")
      } else {
        toast.error(result.message)
      }
    })
  }

  function reject() {
    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setReasonError("Reason is required")
      return
    }

    if (trimmedReason.length > 255) {
      setReasonError("Reason must be at most 255 characters")
      return
    }

    setReasonError(null)

    startTransition(async () => {
      const result = await purchaseRequestReject(id, trimmedReason)

      if (result.success) {
        toast.success(result.message)
        setRejectOpen(false)
        setReason("")
        router.push("/asset-transaction/list-purchase-request")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={approve} disabled={isPending}>
          <Check data-icon="inline-start" />
          Approve
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
        >
          <X data-icon="inline-start" />
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject purchase request</DialogTitle>
            <DialogDescription>
              Enter reason for rejecting this purchase request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError(null)
              }}
              maxLength={255}
              placeholder="Reason"
              disabled={isPending}
            />
            <div className="flex justify-between gap-2 text-sm">
              <p className="text-destructive">{reasonError ?? ""}</p>
              <p className="text-muted-foreground">{reason.length}/255</p>
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
            <Button
              type="button"
              variant="destructive"
              onClick={reject}
              disabled={isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
