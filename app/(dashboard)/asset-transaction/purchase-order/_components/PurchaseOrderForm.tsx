"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { purchaseOrderShowType } from "@/data/purchase-order"
import type {
  purchaseRequestDetailOptionType,
  purchaseRequestOptionType,
  supplierOptionType,
} from "@/data/select"
import {
  purchaseOrderSchema,
  purchaseOrderSchemaType,
} from "@/lib/formSchemas/purchase-order-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition, useEffect } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { NumericFormat } from "react-number-format"
import { purchaseOrderStore, purchaseOrderUpdate } from "../action"
import PurchaseOrderDetailSection from "./PurchaseOrderDetailSection"

interface PurchaseOrderFormProps {
  data?: purchaseOrderShowType
  suppliers: supplierOptionType[]
  purchaseRequests: purchaseRequestOptionType[]
  purchaseRequestDetails: purchaseRequestDetailOptionType[]
}

function getToday() {
  return new Date().toISOString().split("T")[0]
}

export default function PurchaseOrderForm({
  data,
  suppliers,
  purchaseRequests,
  purchaseRequestDetails,
}: PurchaseOrderFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const supplierItems = suppliers.map((s) => ({
    label: s.name,
    value: s.id,
  }))

  const prItems = purchaseRequests.map((pr) => ({
    label: pr.prNo,
    value: pr.id,
  }))

  // Format initial details if editing
  const initialDetails = data?.details?.length
    ? data.details.map((d) => ({
        id: d.id,
        prDtlId: d.prDtlId,
        quantity: d.quantity ?? 0,
        price: d.price ?? 0,
      }))
    : []

  const form = useForm<purchaseOrderSchemaType>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      date: data?.date ?? getToday(),
      prId: data?.prId ?? "",
      supplierId: data?.supplierId ?? "",
      description: data?.description ?? "",
      shippingCost: data?.shippingCost ?? 0,
      details: initialDetails,
    },
  })

  const {
    fields: detailFields,
    replace: replaceDetails,
    remove: removeDetail,
  } = useFieldArray({
    control: form.control,
    name: "details",
    keyName: "fieldId",
  })

  const selectedPrId = useWatch({
    control: form.control,
    name: "prId",
  })

  const shippingCost =
    useWatch({
      control: form.control,
      name: "shippingCost",
    }) ?? 0

  const watchedDetails =
    useWatch({
      control: form.control,
      name: "details",
    }) ?? []

  // Auto-populate detail lines on PR select (only in Create mode)
  useEffect(() => {
    if (data?.id) return // skip in edit mode

    if (!selectedPrId) {
      replaceDetails([])
      return
    }

    const filteredPrDetails = purchaseRequestDetails.filter(
      (dtl) => dtl.prId === selectedPrId && dtl.remainingQuantity > 0
    )

    replaceDetails(
      filteredPrDetails.map((dtl) => ({
        prDtlId: dtl.id,
        quantity: dtl.remainingQuantity,
        price: dtl.price,
      }))
    )
  }, [selectedPrId, purchaseRequestDetails, replaceDetails, data?.id])

  // Filter purchase request detail metadata for the selected PR
  const currentPrDetails = purchaseRequestDetails.filter(
    (dtl) => dtl.prId === selectedPrId
  )

  // Calculations for summary card
  const subtotal = watchedDetails.reduce((sum, d) => {
    const qty = Number(d?.quantity ?? 0)
    const price = Number(d?.price ?? 0)
    return sum + qty * price
  }, 0)

  const grandTotal = subtotal + Number(shippingCost)

  function onSubmit(values: purchaseOrderSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await purchaseOrderUpdate(data.id, values)
        : await purchaseOrderStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset-transaction/purchase-order")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form
      id="form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
      {/* Order Info */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Order Info</h3>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="date"
                    aria-invalid={fieldState.invalid}
                    required
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="prId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Purchase Request No</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    options={prItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select PR No"
                    searchPlaceholder="Search PR No..."
                    emptyMessage="No PR No found"
                    disabled={!purchaseRequests.length || Boolean(data?.id)}
                    required
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="supplierId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Supplier</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    options={supplierItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select Supplier"
                    searchPlaceholder="Search supplier..."
                    emptyMessage="No supplier found"
                    disabled={!suppliers.length}
                    required
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Description"
                    autoComplete="off"
                    required
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="shippingCost"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Shipping Cost</FieldLabel>
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </FieldGroup>
      </div>

      {/* Asset Details */}
      <div className="rounded-lg border p-4">
        <div className="mb-4">
          <h3 className="font-semibold">Order Details</h3>
          <p className="text-sm text-muted-foreground">
            Order items loaded from the selected purchase request. Remove items
            or reduce quantity if needed.
          </p>
        </div>

        {form.formState.errors.details?.root && (
          <p className="mb-2 text-sm text-destructive">
            {form.formState.errors.details.root.message}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {detailFields.length ? (
            detailFields.map((item, index) => (
              <PurchaseOrderDetailSection
                key={item.fieldId}
                index={index}
                control={form.control}
                prDetails={currentPrDetails}
                removeDetail={() => removeDetail(index)}
                canRemove={detailFields.length > 1}
              />
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Select a purchase request above to populate order items.
            </p>
          )}
        </div>
      </div>

      {/* Summary Card */}
      {detailFields.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <h3 className="mb-4 font-semibold">Summary</h3>
          <div className="ml-auto flex max-w-xs flex-col gap-2 text-right">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">
                {subtotal.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping Cost:</span>
              <span className="font-semibold">
                {Number(shippingCost).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-lg">
              <span className="font-bold">Grand Total:</span>
              <span className="font-bold text-primary">
                {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      )}

      <Field>
        <Button
          type="submit"
          id="form"
          disabled={isPending || detailFields.length === 0}
        >
          <LoadingSwap isLoading={isPending}>
            {data?.id ? "Update" : "Create"}
          </LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
