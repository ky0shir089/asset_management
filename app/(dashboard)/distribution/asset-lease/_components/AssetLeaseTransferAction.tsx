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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  assetTransferSchema,
  type assetTransferSchemaType,
} from "@/lib/formSchemas/asset-transfer-schema"
import { useRouter } from "next/navigation"
import { useId, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { assetTransferStore } from "../action"

interface AssetLeaseTransferActionProps {
  rentId: string
  rentDetailId: string
  assetNumber: string
  defaultTransferDate: string
  currentOutlet: { id: string; name: string }
  latestTransfer: {
    id: string
    transferDate: string
    outletName: string
    userName: string
    status: "PENDING" | "RECEIVED"
    receivedAt: Date | null
  } | null
  outlets: Array<{ id: string; outletId: string; name: string }>
  users: Array<{ id: string; name: string; outletId: string }>
}

export default function AssetLeaseTransferAction({
  rentId,
  rentDetailId,
  assetNumber,
  defaultTransferDate,
  currentOutlet,
  latestTransfer,
  outlets,
  users,
}: AssetLeaseTransferActionProps) {
  const router = useRouter()
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [transferDate, setTransferDate] = useState(defaultTransferDate)
  const [outletId, setOutletId] = useState("")
  const [userId, setUserId] = useState("")
  const [errors, setErrors] = useState<
    Partial<Record<keyof assetTransferSchemaType, string>>
  >({})

  const eligibleUsers = useMemo(
    () => users.filter((user) => user.outletId === outletId),
    [outletId, users]
  )
  const outletOptions = outlets
    .filter((outlet) => outlet.id !== currentOutlet.id)
    .map((outlet) => ({
      value: outlet.id,
      label: `${outlet.name} (${outlet.outletId})`,
    }))
  const hasDestinationOutlet = outletOptions.length > 0
  const awaitingReceipt = latestTransfer?.status === "PENDING"
  const userOptions = eligibleUsers.map((user) => ({
    value: user.id,
    label: user.name,
  }))

  function resetForm() {
    setTransferDate(defaultTransferDate)
    setOutletId("")
    setUserId("")
    setErrors({})
  }

  function submit() {
    const values: assetTransferSchemaType = {
      rentId,
      rentDetailId,
      transferDate,
      outletId,
      userId,
      expectedOutletId: currentOutlet.id,
      expectedTransferId: latestTransfer?.id ?? null,
    }
    const validation = assetTransferSchema.safeParse(values)

    if (!validation.success) {
      setErrors(
        Object.fromEntries(
          validation.error.issues.map((issue) => [issue.path[0], issue.message])
        )
      )
      return
    }

    setErrors({})
    startTransition(async () => {
      try {
        const result = await assetTransferStore(validation.data)
        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        setOpen(false)
        resetForm()
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        )
      }
    })
  }

  return (
    <div className="flex min-w-44 flex-col items-start gap-2">
      {latestTransfer && (
        <div className="text-xs leading-5 text-muted-foreground">
          <p className="font-medium text-foreground">
            {latestTransfer.outletName}
          </p>
          <p>{latestTransfer.userName}</p>
          <p>{latestTransfer.transferDate}</p>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isPending && !nextOpen) return
          if (nextOpen) setErrors({})
          setOpen(nextOpen)
        }}
      >
        {hasDestinationOutlet && !awaitingReceipt && (
          <DialogTrigger
            render={
              <Button type="button" size="sm" variant="outline" />
            }
          >
            {latestTransfer ? "Transfer again" : "Transfer"}
          </DialogTrigger>
        )}
        <DialogContent
          showCloseButton={!isPending}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="contents"
            aria-busy={isPending}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Transfer asset {assetNumber}</DialogTitle>
              <DialogDescription>
                Assign asset from {currentOutlet.name} to outlet and user within
                lease company.
              </DialogDescription>
            </DialogHeader>

            {latestTransfer && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Current assignment</p>
                <p className="mt-1 text-muted-foreground">
                  {latestTransfer.outletName} · {latestTransfer.userName} ·{" "}
                  {latestTransfer.transferDate}
                </p>
              </div>
            )}

            <FieldGroup>
              <Field data-invalid={Boolean(errors.transferDate)}>
                <FieldLabel htmlFor={`${fieldId}-date`}>Transfer date</FieldLabel>
                <Input
                  id={`${fieldId}-date`}
                  type="date"
                  value={transferDate}
                  onChange={(event) => {
                    setTransferDate(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      transferDate: undefined,
                    }))
                  }}
                  aria-invalid={Boolean(errors.transferDate)}
                  disabled={isPending}
                  required
                />
                <FieldError>{errors.transferDate}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.outletId)}>
                <FieldLabel htmlFor={`${fieldId}-outlet`}>
                  Destination outlet
                </FieldLabel>
                <SearchableSelect
                  id={`${fieldId}-outlet`}
                  value={outletId}
                  onValueChange={(value) => {
                    setOutletId(value)
                    setUserId("")
                    setErrors((current) => ({
                      ...current,
                      outletId: undefined,
                      userId: undefined,
                    }))
                  }}
                  options={outletOptions}
                  placeholder="Select destination outlet"
                  searchPlaceholder="Search outlet..."
                  emptyMessage="No active outlets for this lease company"
                  aria-invalid={Boolean(errors.outletId)}
                  disabled={isPending || !hasDestinationOutlet}
                  required
                />
                <FieldDescription>
                  Only active outlets within lease company appear.
                </FieldDescription>
                <FieldError>{errors.outletId}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.userId)}>
                <FieldLabel htmlFor={`${fieldId}-user`}>
                  Assigned user
                </FieldLabel>
                <SearchableSelect
                  id={`${fieldId}-user`}
                  value={userId}
                  onValueChange={(value) => {
                    setUserId(value)
                    setErrors((current) => ({ ...current, userId: undefined }))
                  }}
                  options={userOptions}
                  placeholder={
                    outletId ? "Select assigned user" : "Select outlet first"
                  }
                  searchPlaceholder="Search user..."
                  emptyMessage={
                    outletId
                      ? "No eligible users for this outlet"
                      : "Select an outlet first"
                  }
                  aria-invalid={Boolean(errors.userId)}
                  disabled={isPending || !outletId}
                  required
                />
                <FieldDescription>
                  Eligibility follows user latest Talenta login assignment.
                </FieldDescription>
                <FieldError>{errors.userId}</FieldError>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !hasDestinationOutlet}>
                {isPending ? "Transferring…" : "Confirm transfer"}
              </Button>
              {isPending && (
                <span className="sr-only" role="status">
                  Transferring asset
                </span>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {awaitingReceipt ? (
        <p className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Awaiting receipt
        </p>
      ) : (
        !hasDestinationOutlet && (
          <p className="text-xs text-muted-foreground">
            No other active destination outlets.
          </p>
        )
      )}
    </div>
  )
}
