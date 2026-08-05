"use client"

import AssetLeasePhotoInput from "@/components/asset-lease-photo-input"
import { Button } from "@/components/ui/button"
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
import { Trash2 } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormTrigger,
} from "react-hook-form"
import { NumericFormat } from "react-number-format"
import { toast } from "sonner"
import { getAssetCodes, getAssets } from "../action"

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
        <section
          className="mt-4 overflow-hidden rounded-lg border bg-card text-sm"
          aria-labelledby={`asset-summary-${index}`}
        >
          <div className="bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Selected asset
                </p>
                <h3 id={`asset-summary-${index}`} className="font-semibold">
                  {selectedAsset.nomorAssets}
                </h3>
              </div>
              <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                Condition: {selectedAsset.condition || "Unavailable"}
              </span>
            </div>

            {selectedAsset.specifications.length ? (
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedAsset.specifications.map(
                  (specification, specificationIndex) => (
                    <div
                      key={`${specification.name}-${specificationIndex}`}
                      className="rounded-md border bg-background px-3 py-2"
                    >
                      <dt className="text-xs text-muted-foreground">
                        {specification.name}
                      </dt>
                      <dd className="mt-0.5 font-medium wrap-break-word">
                        {specification.value || "-"}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            ) : (
              <div className="rounded-md border bg-background px-3 py-2 text-muted-foreground">
                No specifications recorded.
              </div>
            )}
          </div>
        </section>
      )}

      <Controller
        name={`details.${index}.photos`}
        control={control}
        render={({ field, fieldState }) => (
          <Field className="mt-4" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`photos-${index}`}>
              Before lease photos
            </FieldLabel>
            <FieldDescription id={`photos-${index}-description`}>
              Required. Capture asset condition before this lease. Upload 1-10 JPEG,
              PNG, or WebP files, maximum 1 MB each.
            </FieldDescription>
            <AssetLeasePhotoInput
              id={`photos-${index}`}
              files={field.value}
              dropzoneRef={field.ref}
              describedBy={`photos-${index}-description photos-${index}-error`}
              onChange={(files) => {
                field.onChange(files)
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
