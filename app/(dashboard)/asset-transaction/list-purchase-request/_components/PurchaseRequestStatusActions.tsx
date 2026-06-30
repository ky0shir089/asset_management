"use client"

import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import {
  purchaseRequestApprove,
  purchaseRequestReject,
} from "../../purchase-request/action"

type StatusAction = (id: string) => Promise<{
  success: boolean
  message: string
}>

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

  if (status !== "REQUEST") {
    return null
  }

  function runAction(action: StatusAction) {
    startTransition(async () => {
      const result = await action(id)

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => runAction(purchaseRequestApprove)}
        disabled={isPending}
      >
        <Check data-icon="inline-start" />
        Approve
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => runAction(purchaseRequestReject)}
        disabled={isPending}
      >
        <X data-icon="inline-start" />
        Reject
      </Button>
    </div>
  )
}
