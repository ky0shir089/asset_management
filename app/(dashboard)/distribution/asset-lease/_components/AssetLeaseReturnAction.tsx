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
  assetLeaseReturnSchema,
  type assetLeaseReturnSchemaType,
} from "@/lib/formSchemas/asset-lease-schema"
import { PackageCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { assetLeaseReturn } from "../action"

interface AssetLeaseReturnActionProps {
  rentId: string
  rentDetailId: string
  assetNumber: string
  defaultReturnDate: string
  minimumReturnDate: string
  hasPendingTransfer: boolean
  outlets: Array<{ id: string; outletId: string; name: string }>
}

export default function AssetLeaseReturnAction({
  rentId,
  rentDetailId,
  assetNumber,
  defaultReturnDate,
  minimumReturnDate,
  hasPendingTransfer,
  outlets,
}: AssetLeaseReturnActionProps) {
  const router = useRouter()
  const fieldId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [dateEnd, setDateEnd] = useState(defaultReturnDate)
  const [outletId, setOutletId] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [errors, setErrors] = useState<
    Partial<Record<keyof assetLeaseReturnSchemaType, string>>
  >({})

  const outletOptions = outlets.map((outlet) => ({
    value: outlet.id,
    label: `${outlet.name} (${outlet.outletId})`,
  }))
  const unavailableMessage = hasPendingTransfer
    ? "Receive pending transfer before return."
    : outlets.length === 0
      ? "No active LSA receiving outlet."
      : null

  function resetForm() {
    setDateEnd(defaultReturnDate)
    setOutletId("")
    setPhotos([])
    setErrors({})
  }

  function focusFirstError() {
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus()
    )
  }

  function submit() {
    const values: assetLeaseReturnSchemaType = {
      rentId,
      rentDetailId,
      dateEnd,
      outletId,
      photos,
    }
    const validation = assetLeaseReturnSchema.safeParse(values)

    if (!validation.success) {
      setErrors(
        Object.fromEntries(
          validation.error.issues.map((issue) => [issue.path[0], issue.message])
        )
      )
      focusFirstError()
      return
    }
    if (validation.data.dateEnd < minimumReturnDate) {
      setErrors({
        dateEnd: "Return date cannot be before lease start or latest transfer date",
      })
      focusFirstError()
      return
    }

    setErrors({})
    const formData = new FormData()
    formData.set("rentId", validation.data.rentId)
    formData.set("rentDetailId", validation.data.rentDetailId)
    formData.set("dateEnd", validation.data.dateEnd)
    formData.set("outletId", validation.data.outletId)
    validation.data.photos.forEach((photo) =>
      formData.append(`photos-${rentDetailId}`, photo)
    )

    startTransition(async () => {
      try {
        const result = await assetLeaseReturn(formData)
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
    <div className="flex min-w-40 flex-col items-start gap-2">
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isPending && !nextOpen) return
          if (nextOpen) setErrors({})
          setOpen(nextOpen)
        }}
      >
        <DialogTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={Boolean(unavailableMessage)}
            >
              <PackageCheck className="mr-1.5 size-3.5" aria-hidden="true" />
              Return asset
            </Button>
          }
        />
        <DialogContent
          showCloseButton={!isPending}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        >
          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="contents"
            aria-busy={isPending}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Return asset {assetNumber}</DialogTitle>
              <DialogDescription>
                Record actual return and make asset available at receiving LSA
                outlet.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="space-y-4 py-1">
              <Field data-invalid={Boolean(errors.dateEnd)}>
                <FieldLabel htmlFor={`${fieldId}-date`}>Return date</FieldLabel>
                <Input
                  id={`${fieldId}-date`}
                  type="date"
                  min={minimumReturnDate}
                  max={defaultReturnDate}
                  value={dateEnd}
                  onChange={(event) => {
                    setDateEnd(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      dateEnd: undefined,
                    }))
                  }}
                  aria-invalid={Boolean(errors.dateEnd)}
                  disabled={isPending}
                  required
                />
                <FieldError>{errors.dateEnd}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.outletId)}>
                <FieldLabel htmlFor={`${fieldId}-outlet`}>
                  Receiving outlet
                </FieldLabel>
                <SearchableSelect
                  id={`${fieldId}-outlet`}
                  value={outletId}
                  onValueChange={(value) => {
                    setOutletId(value)
                    setErrors((current) => ({
                      ...current,
                      outletId: undefined,
                    }))
                  }}
                  options={outletOptions}
                  placeholder="Select LSA outlet"
                  searchPlaceholder="Search outlet..."
                  emptyMessage="No active LSA outlet"
                  aria-invalid={Boolean(errors.outletId)}
                  disabled={isPending}
                  required
                />
                <FieldDescription>
                  Asset becomes TERSEDIA at this outlet.
                </FieldDescription>
                <FieldError>{errors.outletId}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.photos)}>
                <FieldLabel htmlFor={`${fieldId}-photos`}>
                  Return photos
                </FieldLabel>
                <AssetLeasePhotoInput
                  id={`${fieldId}-photos`}
                  files={photos}
                  onChange={(files) => {
                    setPhotos(files)
                    setErrors((current) => ({
                      ...current,
                      photos: undefined,
                    }))
                  }}
                  describedBy={`${fieldId}-photos-help ${fieldId}-photos-error`}
                  disabled={isPending}
                />
                <FieldDescription id={`${fieldId}-photos-help`}>
                  Upload 1–10 photos showing returned asset condition.
                </FieldDescription>
                <FieldError id={`${fieldId}-photos-error`}>
                  {errors.photos}
                </FieldError>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Returning…" : "Confirm return"}
              </Button>
              {isPending && (
                <span className="sr-only" role="status">
                  Returning asset
                </span>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {unavailableMessage && (
        <p className="text-xs text-muted-foreground">{unavailableMessage}</p>
      )}
    </div>
  )
}
