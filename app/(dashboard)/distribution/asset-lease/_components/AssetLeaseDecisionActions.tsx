"use client"

import AssetLeasePhotoInput from "@/components/asset-lease-photo-input"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  assetLeaseApproveSchema,
  assetLeaseRejectReasons,
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
  details: Array<{ id: string; assetNumber: string; assetName: string }>
}

function EvidenceFields({
  prefix,
  details,
  photos,
  errors,
  onChange,
  disabled,
}: {
  prefix: string
  details: AssetLeaseDecisionActionsProps["details"]
  photos: Record<string, File[]>
  errors: Record<string, string>
  onChange: (detailId: string, files: File[]) => void
  disabled: boolean
}) {
  return (
    <section className="space-y-3" aria-labelledby={`${prefix}-evidence-title`}>
      <div>
        <h3 id={`${prefix}-evidence-title`} className="font-medium">
          Required evidence
        </h3>
        <p className="text-sm text-muted-foreground">
          Upload 1–10 photos for every asset, maximum 1 MB each.
        </p>
      </div>
      {details.map((detail) => (
        <div
          key={detail.id}
          className="space-y-2 rounded-lg border p-3"
          data-invalid={Boolean(errors[detail.id])}
        >
          <div>
            <p className="font-medium">{detail.assetNumber}</p>
            <p className="text-sm text-muted-foreground">{detail.assetName}</p>
          </div>
          <Label htmlFor={`${prefix}-photos-${detail.id}`}>Photos</Label>
          <AssetLeasePhotoInput
            id={`${prefix}-photos-${detail.id}`}
            files={photos[detail.id] ?? []}
            onChange={(files) => onChange(detail.id, files)}
            describedBy={`${prefix}-evidence-title ${prefix}-photos-${detail.id}-error`}
            disabled={disabled}
          />
          {errors[detail.id] && (
            <p
              id={`${prefix}-photos-${detail.id}-error`}
              className="text-sm text-destructive"
              role="alert"
            >
              {errors[detail.id]}
            </p>
          )}
        </div>
      ))}
    </section>
  )
}

export default function AssetLeaseDecisionActions({
  id,
  status,
  rentDate,
  defaultReceiveDate,
  details,
}: AssetLeaseDecisionActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [receiveDate, setReceiveDate] = useState(defaultReceiveDate)
  const [reason, setReason] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [approvePhotos, setApprovePhotos] = useState<Record<string, File[]>>({})
  const [rejectPhotos, setRejectPhotos] = useState<Record<string, File[]>>({})
  const [approvePhotoErrors, setApprovePhotoErrors] = useState<
    Record<string, string>
  >({})
  const [rejectPhotoErrors, setRejectPhotoErrors] = useState<
    Record<string, string>
  >({})

  function validationErrors(
    issues: Array<{ path: PropertyKey[]; message: string }>
  ) {
    const photoErrors: Record<string, string> = {}
    let formError: string | null = null
    for (const issue of issues) {
      if (issue.path[0] === "details" && typeof issue.path[1] === "number") {
        const detail = details[issue.path[1]]
        if (detail) photoErrors[detail.id] ??= issue.message
      } else {
        formError ??= issue.message
      }
    }
    return { photoErrors, formError }
  }

  function decisionDetails(photos: Record<string, File[]>) {
    return details.map((detail) => ({
      rentDetailId: detail.id,
      photos: photos[detail.id] ?? [],
    }))
  }

  function decisionFormData(
    photos: Record<string, File[]>,
    values: Record<string, string>
  ) {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => formData.set(key, value))
    details.forEach((detail) =>
      (photos[detail.id] ?? []).forEach((photo) =>
        formData.append(`photos-${detail.id}`, photo)
      )
    )
    return formData
  }

  if (status !== "NEW") return null

  function approve() {
    const validation = assetLeaseApproveSchema.safeParse({
      id,
      rentDate,
      receiveDate,
      details: decisionDetails(approvePhotos),
    })
    if (!validation.success) {
      const errors = validationErrors(validation.error.issues)
      setFieldError(errors.formError)
      setApprovePhotoErrors(errors.photoErrors)
      return
    }

    setFieldError(null)
    setApprovePhotoErrors({})
    startTransition(async () => {
      try {
        const result = await assetLeaseApprove(
          decisionFormData(approvePhotos, { id, receiveDate })
        )
        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        setApprovePhotos({})
        setApproveOpen(false)
        router.replace("/distribution/asset-lease")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        )
      }
    })
  }

  function reject() {
    const validation = assetLeaseRejectSchema.safeParse({
      id,
      reason,
      details: decisionDetails(rejectPhotos),
    })
    if (!validation.success) {
      const errors = validationErrors(validation.error.issues)
      setFieldError(errors.formError)
      setRejectPhotoErrors(errors.photoErrors)
      return
    }

    setFieldError(null)
    setRejectPhotoErrors({})
    startTransition(async () => {
      try {
        const result = await assetLeaseReject(
          decisionFormData(rejectPhotos, {
            id,
            reason: validation.data.reason,
          })
        )
        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        setReason("")
        setRejectPhotos({})
        setRejectOpen(false)
        router.replace("/distribution/asset-lease")
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
          if (open) {
            setFieldError(null)
            setRejectPhotoErrors({})
          }
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
        <DialogContent
          showCloseButton={!isPending}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        >
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
                Select a reason for rejecting this asset lease.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="asset-lease-rejection-reason">
                Rejection reason
              </Label>
              <Select
                value={reason || null}
                onValueChange={(value) => {
                  setReason(value ?? "")
                  setFieldError(null)
                }}
                disabled={isPending}
                required
              >
                <SelectTrigger
                  id="asset-lease-rejection-reason"
                  className="w-full"
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={
                    fieldError ? "asset-lease-rejection-error" : undefined
                  }
                >
                  <SelectValue placeholder="Select rejection reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {assetLeaseRejectReasons.map((rejectReason) => (
                      <SelectItem key={rejectReason} value={rejectReason}>
                        {rejectReason}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldError && (
                <p
                  id="asset-lease-rejection-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {fieldError}
                </p>
              )}
            </div>

            <EvidenceFields
              prefix="reject"
              details={details}
              photos={rejectPhotos}
              errors={rejectPhotoErrors}
              onChange={(detailId, files) => {
                setRejectPhotos((current) => ({
                  ...current,
                  [detailId]: files,
                }))
                setRejectPhotoErrors((current) => ({
                  ...current,
                  [detailId]: "",
                }))
              }}
              disabled={isPending}
            />

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
          if (open) {
            setFieldError(null)
            setApprovePhotoErrors({})
          }
          setApproveOpen(open)
        }}
      >
        <DialogTrigger
          render={<Button type="button" size="sm" disabled={isPending} />}
        >
          Approve
        </DialogTrigger>
        <DialogContent
          showCloseButton={!isPending}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        >
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

            <EvidenceFields
              prefix="approve"
              details={details}
              photos={approvePhotos}
              errors={approvePhotoErrors}
              onChange={(detailId, files) => {
                setApprovePhotos((current) => ({
                  ...current,
                  [detailId]: files,
                }))
                setApprovePhotoErrors((current) => ({
                  ...current,
                  [detailId]: "",
                }))
              }}
              disabled={isPending}
            />

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
