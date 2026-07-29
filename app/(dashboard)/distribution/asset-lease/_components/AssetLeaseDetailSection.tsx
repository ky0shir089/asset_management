"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
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
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type Ref,
} from "react"
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormTrigger,
} from "react-hook-form"
import { NumericFormat } from "react-number-format"
import { toast } from "sonner"
import { getAssetCodes, getAssets } from "../action"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function PhotoDropzone({
  files,
  onChange,
  id,
  dropzoneRef,
  describedBy,
}: {
  files: FileList | File[] | null | undefined
  onChange: (files: FileList | File[] | null) => void
  id: string
  dropzoneRef: Ref<HTMLDivElement>
  describedBy: string
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
      const rejectedTypes: string[] = []
      const rejectedSizes: string[] = []

      for (const file of Array.from(incoming)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          rejectedTypes.push(file.name)
          continue
        }
        if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
          rejectedSizes.push(file.name)
          continue
        }
        filtered.push(file)
      }

      if (filtered.length > availableSlots) {
        toast.error(`Upload at most ${MAX_PHOTO_FILE_COUNT} photos`)
      }
      if (rejectedTypes.length) {
        toast.error(
          `${rejectedTypes.join(", ")} must be JPEG, PNG, or WebP files`
        )
      }
      if (rejectedSizes.length) {
        toast.error(
          `${rejectedSizes.join(", ")} exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }

      if (!filtered.length) return
      onChange([...existing, ...filtered.slice(0, availableSlots)])
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
        ref={dropzoneRef}
        role="button"
        tabIndex={0}
        aria-describedby={describedBy}
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
  categoryItems: SearchableSelectOption[]
  removeDetail: () => void
  canRemove: boolean
}

export default function AssetLeaseDetailSection({
  index,
  control,
  errors,
  trigger,
  categoryItems,
  removeDetail,
  canRemove,
}: AssetLeaseDetailSectionProps) {
  const detailErrors = errors.details?.[index]
  const [categoryId, setCategoryId] = useState("")
  const [codeId, setCodeId] = useState("")
  const [codeItems, setCodeItems] = useState<SearchableSelectOption[]>([])
  const [assets, setAssets] = useState<
    Array<{
      id: string
      nomorAssets: string
      condition: string
      specifications: Array<{ name: string; value: string | null }>
    }>
  >([])
  const [selectedAsset, setSelectedAsset] = useState<
    (typeof assets)[number] | null
  >(null)
  const [, startCodeTransition] = useTransition()
  const [, startAssetTransition] = useTransition()
  const [isLoadingCodes, setIsLoadingCodes] = useState(false)
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const codeRequestId = useRef(0)
  const assetRequestId = useRef(0)
  const assetItems = assets.map(({ id, nomorAssets }) => ({
    value: id,
    label: nomorAssets,
  }))

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

      <Controller
        name={`details.${index}.assetId`}
        control={control}
        render={({ field, fieldState }) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor={`asset-category-${index}`}>
                Asset Category
              </FieldLabel>
              <SearchableSelect
                id={`asset-category-${index}`}
                name={`asset-category-${index}`}
                options={categoryItems}
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  setCodeId("")
                  setCodeItems([])
                  setAssets([])
                  setSelectedAsset(null)
                  field.onChange("")
                  const requestId = ++codeRequestId.current
                  ++assetRequestId.current
                  setIsLoadingCodes(true)
                  setIsLoadingAssets(false)
                  startCodeTransition(async () => {
                    try {
                      const result = await getAssetCodes(value)
                      if (requestId !== codeRequestId.current) return
                      if (!result.success) {
                        toast.error(result.message)
                        return
                      }
                      setCodeItems(
                        result.data.map(({ id, code, name }) => ({
                          value: id,
                          label: `${code} - ${name}`,
                        }))
                      )
                    } catch (error) {
                      if (requestId === codeRequestId.current) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Something went wrong"
                        )
                      }
                    } finally {
                      if (requestId === codeRequestId.current) {
                        setIsLoadingCodes(false)
                      }
                    }
                  })
                }}
                placeholder="Select Asset Category"
                searchPlaceholder="Search category..."
                emptyMessage="No category found"
                disabled={!categoryItems.length}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`asset-code-${index}`}>
                Asset Code
              </FieldLabel>
              <SearchableSelect
                id={`asset-code-${index}`}
                name={`asset-code-${index}`}
                options={codeItems}
                value={codeId}
                onValueChange={(value) => {
                  setCodeId(value)
                  setAssets([])
                  setSelectedAsset(null)
                  field.onChange("")
                  const requestId = ++assetRequestId.current
                  setIsLoadingAssets(true)
                  startAssetTransition(async () => {
                    try {
                      const result = await getAssets(value)
                      if (requestId !== assetRequestId.current) return
                      if (!result.success) {
                        toast.error(result.message)
                        return
                      }
                      setAssets(result.data)
                    } catch (error) {
                      if (requestId === assetRequestId.current) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Something went wrong"
                        )
                      }
                    } finally {
                      if (requestId === assetRequestId.current) {
                        setIsLoadingAssets(false)
                      }
                    }
                  })
                }}
                placeholder={
                  isLoadingCodes ? "Loading codes..." : "Select Asset Code"
                }
                searchPlaceholder="Search asset code..."
                emptyMessage="No asset code found"
                disabled={!categoryId || isLoadingCodes}
              />
            </Field>

            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Asset Number</FieldLabel>
              <SearchableSelect
                id={field.name}
                name={field.name}
                options={assetItems}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  setSelectedAsset(
                    assets.find((asset) => asset.id === value) ?? null
                  )
                  void trigger("details")
                  void trigger(`details.${index}.assetId`)
                }}
                placeholder={
                  isLoadingAssets ? "Loading assets..." : "Select Asset Number"
                }
                searchPlaceholder="Search asset number..."
                emptyMessage="No asset found"
                disabled={!codeId || isLoadingAssets}
                required
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[detailErrors?.assetId]} />
            </Field>

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
        )}
      />

      {selectedAsset && (
        <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="font-medium">Condition</dt>
              <dd className="text-muted-foreground">
                {selectedAsset.condition || "-"}
              </dd>
            </div>
            {selectedAsset.specifications.map(
              (specification, specificationIndex) => (
                <div key={`${specification.name}-${specificationIndex}`}>
                  <dt className="font-medium">{specification.name}</dt>
                  <dd className="text-muted-foreground">
                    {specification.value || "-"}
                  </dd>
                </div>
              )
            )}
          </dl>
        </div>
      )}

      <Controller
        name={`details.${index}.photos`}
        control={control}
        render={({ field, fieldState }) => (
          <Field className="mt-4" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`photos-${index}`}>Photos</FieldLabel>
            <FieldDescription id={`photos-${index}-description`}>
              Required. Upload 1-10 JPEG, PNG, or WebP files, maximum 1 MB each.
            </FieldDescription>
            <PhotoDropzone
              id={`photos-${index}`}
              files={field.value}
              dropzoneRef={field.ref}
              describedBy={`photos-${index}-description photos-${index}-error`}
              onChange={(files) => {
                field.onChange(files ? Array.from(files) : [])
                void trigger(`details.${index}.photos`)
              }}
            />
            <FieldError
              id={`photos-${index}-error`}
              errors={[detailErrors?.photos]}
            />
          </Field>
        )}
      />
    </FieldSet>
  )
}
