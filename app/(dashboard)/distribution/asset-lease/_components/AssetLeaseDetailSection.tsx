"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select"
import type { assetLeaseSchemaType } from "@/lib/formSchemas/asset-lease-schema"
import {
  MAX_PHOTO_FILE_COUNT,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
} from "@/lib/upload-constants"
import { ImagePlus, Trash2, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useMemo, useRef, useState, type DragEvent } from "react"
import { toast } from "sonner"
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormTrigger,
} from "react-hook-form"
import { NumericFormat } from "react-number-format"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function PhotoDropzone({
  files,
  onChange,
  id,
}: {
  files: FileList | File[] | null | undefined
  onChange: (files: FileList | File[] | null) => void
  id: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<{
    url: string
    name: string
  } | null>(null)

  const previews = useMemo(() => {
    if (!files || !files.length) return []
    return Array.from(files).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }))
  }, [files])

  const mergeFiles = useCallback(
    (incoming: FileList | File[]) => {
      const existing = files ? Array.from(files) : []
      const availableSlots = MAX_PHOTO_FILE_COUNT - existing.length

      if (availableSlots <= 0) {
        toast.error(`Upload at most ${MAX_PHOTO_FILE_COUNT} photos`)
        return
      }

      const filtered: File[] = []
      const rejected: string[] = []

      for (const f of Array.from(incoming).slice(0, availableSlots)) {
        if (!ACCEPTED_TYPES.includes(f.type)) continue
        if (f.size > MAX_PHOTO_FILE_SIZE_BYTES) {
          rejected.push(f.name)
          continue
        }
        filtered.push(f)
      }

      if (incoming.length > availableSlots) {
        toast.error(`Upload at most ${MAX_PHOTO_FILE_COUNT} photos`)
      }
      if (rejected.length) {
        toast.error(
          `${rejected.join(", ")} exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }

      if (!filtered.length) return
      onChange([...existing, ...filtered])
    },
    [files, onChange]
  )

  const removeFile = useCallback(
    (idx: number) => {
      if (!files) return
      const arr = Array.from(files).filter((_, i) => i !== idx)
      onChange(arr.length ? arr : null)
    },
    [files, onChange]
  )

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragOut = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      if (e.dataTransfer.files?.length) {
        mergeFiles(e.dataTransfer.files)
      }
    },
    [mergeFiles]
  )

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-sm transition-colors ${
          dragging
            ? "border-primary bg-primary/5 text-primary"
            : "border-muted-foreground/25 text-muted-foreground hover:border-primary/50"
        }`}
      >
        <ImagePlus className="mb-1 size-6" />
        <span>Drop photos here or click to browse</span>
        <span className="text-xs">JPG, PNG, WebP</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) mergeFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <div key={`${p.name}-${i}`} className="group relative">
              <button
                type="button"
                onClick={() => setLightbox(p)}
                className="cursor-pointer"
                aria-label={`Preview ${p.name}`}
              >
                <Image
                  src={p.url}
                  alt={p.name}
                  width={0}
                  height={0}
                  unoptimized
                  className="size-28 rounded-md border object-cover"
                />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  URL.revokeObjectURL(p.url)
                  removeFile(i)
                }}
                className="text-destructive-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${p.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!lightbox}
        onOpenChange={(open) => {
          if (!open) setLightbox(null)
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogTitle className="sr-only">
            {lightbox?.name ?? "Photo preview"}
          </DialogTitle>
          {lightbox && (
            <Image
              src={lightbox.url}
              alt={lightbox.name}
              width={0}
              height={0}
              unoptimized
              className="h-auto w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface AssetLeaseDetailSectionProps {
  index: number
  control: Control<assetLeaseSchemaType>
  errors: FieldErrors<assetLeaseSchemaType>
  trigger: UseFormTrigger<assetLeaseSchemaType>
  assetItems: SearchableSelectOption[]
  customerItems: SearchableSelectOption[]
  removeDetail: () => void
  canRemove: boolean
}

export default function AssetLeaseDetailSection({
  index,
  control,
  errors,
  trigger,
  assetItems,
  customerItems,
  removeDetail,
  canRemove,
}: AssetLeaseDetailSectionProps) {
  const selectedOutletId = useWatch({ control, name: "outletId" })
  const detailErrors = errors.details?.[index]

  return (
    <FieldSet className="relative rounded-md border p-4">
      <FieldLegend className="mb-3 text-sm">Item {index + 1}</FieldLegend>
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        className="absolute top-4 right-4"
        onClick={removeDetail}
        disabled={!canRemove}
        aria-label={`Remove detail ${index + 1}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>

      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          name={`details.${index}.assetId`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Asset</FieldLabel>
              <SearchableSelect
                id={field.name}
                name={field.name}
                options={assetItems}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  void trigger("details")
                  void trigger(`details.${index}.assetId`)
                }}
                placeholder="Select Asset"
                searchPlaceholder="Search asset..."
                emptyMessage="No asset found"
                disabled={!assetItems.length}
                required
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[detailErrors?.assetId]} />
            </Field>
          )}
        />

        <Controller
          name={`details.${index}.customerId`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Customer</FieldLabel>
              <SearchableSelect
                id={field.name}
                name={field.name}
                options={customerItems}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  void trigger(`details.${index}.customerId`)
                }}
                placeholder={
                  selectedOutletId ? "Select Customer" : "Select outlet first"
                }
                searchPlaceholder="Search customer..."
                emptyMessage="No customer found"
                disabled={!selectedOutletId}
                required
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[detailErrors?.customerId]} />
            </Field>
          )}
        />

        <Controller
          name={`details.${index}.amount`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
              <NumericFormat
                id={field.name}
                name={field.name}
                value={Number(field.value)}
                customInput={Input}
                getInputRef={field.ref}
                thousandSeparator
                decimalScale={0}
                allowNegative={false}
                onBlur={field.onBlur}
                onValueChange={({ floatValue }) =>
                  field.onChange(floatValue ?? 0)
                }
                aria-invalid={fieldState.invalid}
                required
              />
              <FieldError errors={[detailErrors?.amount]} />
            </Field>
          )}
        />
      </div>

      <Controller
        name={`details.${index}.photos`}
        control={control}
        render={({ field }) => (
          <Field className="mt-4">
            <FieldLabel htmlFor={`photos-${index}`}>Photos</FieldLabel>
            <PhotoDropzone
              id={`photos-${index}`}
              files={field.value as FileList | File[] | null | undefined}
              onChange={field.onChange}
            />
          </Field>
        )}
      />
    </FieldSet>
  )
}
