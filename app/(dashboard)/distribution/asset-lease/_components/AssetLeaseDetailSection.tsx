"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
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
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormTrigger,
} from "react-hook-form"
import { NumericFormat } from "react-number-format"

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                onValueChange={field.onChange}
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
          name={`details.${index}.dateStart`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Start Date</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="date"
                onChange={(event) => {
                  field.onChange(event)
                  void trigger(`details.${index}.dateEnd`)
                }}
                aria-invalid={fieldState.invalid}
                required
              />
              <FieldError errors={[detailErrors?.dateStart]} />
            </Field>
          )}
        />

        <Controller
          name={`details.${index}.dateEnd`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>End Date</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="date"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[detailErrors?.dateEnd]} />
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
    </FieldSet>
  )
}
