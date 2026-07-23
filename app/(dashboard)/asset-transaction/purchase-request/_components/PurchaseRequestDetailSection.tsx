"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type {
  assetCodeOptionType,
  assetSpecOptionType,
  assetSpecValueOptionType,
} from "@/data/select"
import type { purchaseRequestSchemaType } from "@/lib/formSchemas/purchase-request-schema"
import { Trash2 } from "lucide-react"
import {
  Control,
  Controller,
  FieldErrors,
  useFieldArray,
  useWatch,
} from "react-hook-form"
import { NumericFormat } from "react-number-format"

interface PurchaseRequestDetailSectionProps {
  index: number
  control: Control<purchaseRequestSchemaType>
  codes: assetCodeOptionType[]
  specs: assetSpecOptionType[]
  specValues: assetSpecValueOptionType[]
  codeItems: { label: string; value: string }[]
  selectedAssetCategoryId: string
  removeDetail: () => void
  canRemove: boolean
  errors: FieldErrors<purchaseRequestSchemaType>
}

export default function PurchaseRequestDetailSection({
  index,
  control,
  codes,
  specs,
  specValues,
  codeItems,
  selectedAssetCategoryId,
  removeDetail,
  canRemove,
  errors,
}: PurchaseRequestDetailSectionProps) {
  const { fields: specFields, replace: replaceSpecs } = useFieldArray({
    control,
    name: `details.${index}.specifications`,
    keyName: "fieldId",
  })

  const selectedAssetCodeId = useWatch({
    control,
    name: `details.${index}.assetCodeId`,
  })
  const selectedSpecifications =
    useWatch({
      control,
      name: `details.${index}.specifications`,
    }) ?? []
  const quantity = useWatch({ control, name: `details.${index}.quantity` }) ?? 0
  const price = useWatch({ control, name: `details.${index}.price` }) ?? 0
  const total = Number(quantity) * Number(price)
  const assetCodePlaceholder = selectedAssetCategoryId
    ? codes.length
      ? "Asset Code"
      : "No asset codes available"
    : "Select category first"
  const filteredSpecs = selectedAssetCodeId
    ? specs.filter((spec) => spec.codeId === selectedAssetCodeId)
    : []
  const detailErrors = errors.details?.[index]

  function getSpecValueItems(specId: string, currentValue: string) {
    const items = specValues
      .filter((option) => option.specId === specId && option.value)
      .map((option) => ({
        label: option.value,
        value: option.value,
      }))

    if (
      currentValue &&
      !items.some(
        (option) => option.value.toLowerCase() === currentValue.toLowerCase()
      )
    ) {
      items.push({ label: currentValue, value: currentValue })
    }

    return items
  }

  function loadAssetCodeSpecs(assetCodeId: string) {
    replaceSpecs(
      specs
        .filter((spec) => spec.codeId === assetCodeId)
        .map((spec) => ({ specId: spec.id, specValue: "" }))
    )
  }

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium">Item {index + 1}</h4>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={removeDetail}
          disabled={!canRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Controller
          name={`details.${index}.assetCodeId`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Asset Code</FieldLabel>
              <SearchableSelect
                id={field.name}
                name={field.name}
                options={codeItems}
                value={field.value}
                onValueChange={(value) => {
                  if (value !== field.value) {
                    field.onChange(value)
                    loadAssetCodeSpecs(value)
                  }
                }}
                placeholder={assetCodePlaceholder}
                searchPlaceholder="Search asset code..."
                emptyMessage="No asset code found"
                required
                disabled={!codes.length}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name={`details.${index}.quantity`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min={1}
                aria-invalid={fieldState.invalid}
                placeholder="Quantity"
                onChange={(e) => field.onChange(Number(e.target.value))}
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name={`details.${index}.price`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Price</FieldLabel>
              <NumericFormat
                required
                value={Number(field.value)}
                customInput={Input}
                thousandSeparator
                onValueChange={(values) => {
                  const val = values.floatValue ?? 0
                  field.onChange(val)
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <FieldLabel>Total Amount</FieldLabel>
          <NumericFormat
            required
            value={total}
            customInput={Input}
            thousandSeparator
          />
        </Field>
      </div>

      <div className="mt-4 rounded border p-3">
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-sm font-medium text-muted-foreground">
            Specifications
          </h5>
        </div>

        {detailErrors?.specifications?.root && (
          <p className="mb-2 text-sm text-destructive">
            {detailErrors.specifications.root.message}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {specFields.length ? (
            specFields.map((spec, specIndex) => {
              const selectedSpecId =
                selectedSpecifications[specIndex]?.specId ?? ""
              const selectedSpec = filteredSpecs.find(
                (spec) => spec.id === selectedSpecId
              )
              const isSelectSpec = selectedSpec?.type === "SELECT"
              const createable = Boolean(selectedSpec?.createable)
              const required = Boolean(selectedSpec?.isRequired)

              return (
                <div
                  key={spec.fieldId}
                  className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"
                >
                  <Controller
                    name={`details.${index}.specifications.${specIndex}.specId`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Input
                          id={field.name}
                          value={selectedSpec?.name ?? ""}
                          readOnly
                          tabIndex={-1}
                          aria-invalid={fieldState.invalid}
                          placeholder="Specification"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name={`details.${index}.specifications.${specIndex}.specValue`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        {isSelectSpec ? (
                          <SearchableSelect
                            id={field.name}
                            name={field.name}
                            options={getSpecValueItems(
                              selectedSpecId,
                              field.value
                            )}
                            value={field.value}
                            onValueChange={field.onChange}
                            creatable={createable}
                            onCreateOption={
                              createable ? field.onChange : undefined
                            }
                            placeholder="Spec Value"
                            searchPlaceholder="Search spec value..."
                            emptyMessage="No spec value found"
                            required={required}
                            disabled={!selectedSpecId}
                            aria-invalid={fieldState.invalid}
                          />
                        ) : (
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder="Spec Value"
                            autoComplete="off"
                            required={required}
                          />
                        )}
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              Select asset code to load specifications.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
