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
  FieldLabel,
} from "@/components/ui/field"
import { assetTransferReceiptSchema } from "@/lib/formSchemas/asset-transfer-schema"
import { useRouter } from "next/navigation"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"
import { assetTransferReceive } from "../../asset-lease/action"

export default function AssetTransferReceiptAction({
  transfer,
}: {
  transfer: {
    id: string
    rentNo: string | null
    assetNumber: string
    assetName: string
    outletName: string
  }
}) {
  const id = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState<string>()
  const [isPending, startTransition] = useTransition()

  function submit() {
    const validation = assetTransferReceiptSchema.safeParse({
      transferId: transfer.id,
      photos,
    })
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Photos are required")
      return
    }

    const formData = new FormData()
    formData.set("transferId", transfer.id)
    photos.forEach((photo) => formData.append("photos", photo))
    setError(undefined)
    startTransition(async () => {
      try {
        const result = await assetTransferReceive(formData)
        if (!result.success) {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        setPhotos([])
        setOpen(false)
        router.refresh()
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : "Something went wrong"
        )
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending && !nextOpen) return
        if (!nextOpen) {
          setPhotos([])
          setError(undefined)
        }
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" />}>
        Confirm receipt
      </DialogTrigger>
      <DialogContent
        showCloseButton={!isPending}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
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
            <DialogTitle>Confirm asset receipt</DialogTitle>
            <DialogDescription>
              Verify destination and upload receipt evidence.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Lease</dt>
              <dd className="font-medium">
                {transfer.rentNo ?? "Standalone transfer"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="font-medium">{transfer.outletName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Asset</dt>
              <dd className="font-medium">
                {transfer.assetNumber} · {transfer.assetName}
              </dd>
            </div>
          </dl>

          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`${id}-photos`}>Receipt photos</FieldLabel>
            <FieldDescription id={`${id}-description`}>
              Required. Upload 1–10 JPEG, PNG, or WebP files, maximum 1 MB each.
            </FieldDescription>
            <AssetLeasePhotoInput
              id={`${id}-photos`}
              files={photos}
              onChange={(files) => {
                setPhotos(files)
                setError(undefined)
              }}
              describedBy={`${id}-description ${id}-error`}
              disabled={isPending}
            />
            <FieldError id={`${id}-error`}>{error}</FieldError>
          </Field>

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
              {isPending ? "Confirming…" : "Confirm receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
