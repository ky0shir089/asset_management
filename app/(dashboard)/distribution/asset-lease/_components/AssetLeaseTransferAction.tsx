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
  ASSET_TRANSFER_CONDITIONS,
  assetTransferSchema,
  type assetTransferSchemaType,
} from "@/lib/formSchemas/asset-transfer-schema"
import { ArrowRightLeft } from "lucide-react"
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
  const [condition, setCondition] = useState<
    typeof ASSET_TRANSFER_CONDITIONS[number] | ""
  >("")
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
  const conditionOptions = ASSET_TRANSFER_CONDITIONS.map((item) => ({
    value: item,
    label: item,
  }))

  function resetForm() {
    setTransferDate(defaultTransferDate)
    setCondition("")
    setOutletId("")
    setUserId("")
    setErrors({})
  }

  function submit() {
    const values: assetTransferSchemaType = {
      rentId,
      rentDetailId,
      transferDate,
      condition: condition as typeof ASSET_TRANSFER_CONDITIONS[number],
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
              <Button type="button" size="sm" variant="outline">
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {latestTransfer ? "Transfer again" : "Transfer"}
              </Button>
            }
          />
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
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Transfer Asset #{assetNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Reassign asset location, condition, and user within lease company.
              </DialogDescription>
            </DialogHeader>

            {latestTransfer && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                <span className="font-medium text-foreground">Current Assignment:</span>{" "}
                <span className="text-muted-foreground">
                  {latestTransfer.outletName} · {latestTransfer.userName} ·{" "}
                  {latestTransfer.transferDate}
                </span>
              </div>
            )}

            <FieldGroup className="space-y-4 py-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.transferDate)}>
                  <FieldLabel
                    htmlFor={`${fieldId}-date`}
                    className="text-xs font-medium"
                  >
                    Transfer Date
                  </FieldLabel>
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
                    className="h-9 text-xs"
                  />
                  <FieldError>{errors.transferDate}</FieldError>
                </Field>

                <Field data-invalid={Boolean(errors.condition)}>
                  <FieldLabel
                    htmlFor={`${fieldId}-condition`}
                    className="text-xs font-medium"
                  >
                    Asset Condition
                  </FieldLabel>
                  <SearchableSelect
                    id={`${fieldId}-condition`}
                    value={condition}
                    onValueChange={(value) => {
                      setCondition(
                        value as typeof ASSET_TRANSFER_CONDITIONS[number]
                      )
                      setErrors((current) => ({
                        ...current,
                        condition: undefined,
                      }))
                    }}
                    options={conditionOptions}
                    placeholder="Select condition"
                    searchPlaceholder="Search condition..."
                    emptyMessage="No matching condition"
                    aria-invalid={Boolean(errors.condition)}
                    disabled={isPending}
                    required
                  />
                  <FieldError>{errors.condition}</FieldError>
                </Field>
              </div>

              <Field data-invalid={Boolean(errors.outletId)}>
                <FieldLabel
                  htmlFor={`${fieldId}-outlet`}
                  className="text-xs font-medium"
                >
                  Destination Outlet
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
                <FieldDescription className="text-[11px]">
                  Active outlets within lease company.
                </FieldDescription>
                <FieldError>{errors.outletId}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.userId)}>
                <FieldLabel
                  htmlFor={`${fieldId}-user`}
                  className="text-xs font-medium"
                >
                  Assigned User
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
                <FieldDescription className="text-[11px]">
                  Follows user latest Talenta login assignment.
                </FieldDescription>
                <FieldError>{errors.userId}</FieldError>
              </Field>
            </FieldGroup>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !hasDestinationOutlet}
                size="sm"
              >
                {isPending ? "Transferring…" : "Confirm Transfer"}
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
