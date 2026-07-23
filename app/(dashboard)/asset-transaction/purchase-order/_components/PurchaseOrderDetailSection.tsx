"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { purchaseRequestDetailOptionType } from "@/data/select"
import type { purchaseOrderSchemaType } from "@/lib/formSchemas/purchase-order-schema"
import { Trash2 } from "lucide-react"
import { Control, Controller, useWatch } from "react-hook-form"
import { NumericFormat } from "react-number-format"

interface PurchaseOrderDetailSectionProps {
  index: number
  control: Control<purchaseOrderSchemaType>
  prDetails: purchaseRequestDetailOptionType[]
  removeDetail: () => void
  canRemove: boolean
}

export default function PurchaseOrderDetailSection({
  index,
  control,
  prDetails,
  removeDetail,
  canRemove,
}: PurchaseOrderDetailSectionProps) {
  const prDtlId = useWatch({
    control,
    name: `details.${index}.prDtlId`,
  })
  const quantity = useWatch({ control, name: `details.${index}.quantity` }) ?? 0
  const price = useWatch({ control, name: `details.${index}.price` }) ?? 0
  const total = Number(quantity) * Number(price)

  const selectedPrDtl = prDetails.find((d) => d.id === prDtlId)

  const specifications = selectedPrDtl?.specifications ?? []

  const assetCodeText = selectedPrDtl?.assetCode
    ? `${selectedPrDtl.assetCode.code} - ${selectedPrDtl.assetCode.name}`
    : "-"

  const maxAllowedQuantity = selectedPrDtl
    ? selectedPrDtl.remainingQuantity
    : 1

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

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel>Asset Code</FieldLabel>
          <Input value={assetCodeText} readOnly tabIndex={-1} className="bg-muted" />
        </Field>

        <Field className="lg:col-span-2">
          <FieldLabel>Specifications</FieldLabel>
          <div className="min-h-9 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            {specifications.length ? (
              <ul className="space-y-1">
                {specifications.map((spec) => (
                  <li
                    key={spec.id}
                    className="flex justify-between gap-3 border-b pb-1 last:border-b-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">{spec.specName}</span>
                    <span className="text-right font-medium">
                      {spec.specValue || "-"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">No specifications</span>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel>PR Qty</FieldLabel>
            <Input value={selectedPrDtl?.quantity ?? 0} readOnly tabIndex={-1} className="bg-muted" />
          </Field>
          <Field>
            <FieldLabel>Remaining Qty</FieldLabel>
            <Input value={selectedPrDtl?.remainingQuantity ?? 0} readOnly tabIndex={-1} className="bg-muted" />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Controller
          name={`details.${index}.quantity`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Order Quantity</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min={1}
                max={maxAllowedQuantity}
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
            readOnly
            className="bg-muted"
          />
        </Field>
      </div>
    </div>
  )
}
