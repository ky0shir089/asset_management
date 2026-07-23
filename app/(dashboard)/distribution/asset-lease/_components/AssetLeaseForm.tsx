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
import type {
  assetLeaseAssetOptionType,
  assetLeaseCustomerOptionType,
  outletOptionType,
} from "@/data/select"
import {
  assetLeaseSchema,
  type assetLeaseSchemaType,
} from "@/lib/formSchemas/asset-lease-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { assetLeaseStore } from "../action"
import AssetLeaseDetailSection from "./AssetLeaseDetailSection"

interface AssetLeaseFormProps {
  outlets: outletOptionType[]
  customers: assetLeaseCustomerOptionType[]
  assets: assetLeaseAssetOptionType[]
}

function jakartaToday(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = Object.fromEntries(
    fmt
      .formatToParts(new Date())
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function blankDetail() {
  return {
    assetId: "",
    customerId: "",
    dateStart: jakartaToday(),
    dateEnd: "",
    amount: 0,
  }
}

export default function AssetLeaseForm({
  outlets,
  customers,
  assets,
}: AssetLeaseFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<assetLeaseSchemaType>({
    resolver: zodResolver(assetLeaseSchema),
    defaultValues: {
      outletId: "",
      note: "",
      details: [blankDetail()],
    },
  })
  const {
    fields: detailFields,
    append: appendDetail,
    remove: removeDetail,
  } = useFieldArray({
    control: form.control,
    name: "details",
    keyName: "fieldId",
  })
  const selectedOutletId = useWatch({
    control: form.control,
    name: "outletId",
  })

  const outletItems = outlets.map(({ id, name }) => ({
    value: id,
    label: name,
  }))
  const assetItems = assets.map((asset) => {
    const assetCode = asset.assetCode

    return {
      value: asset.id,
      label:
        [asset.nomorAssets, assetCode?.code, assetCode?.name]
          .filter(Boolean)
          .join(" - ") || asset.id,
    }
  })
  const customerItems = customers
    .filter((customer) => customer.outletId === selectedOutletId)
    .map(({ id, name }) => ({ value: id, label: name }))

  function changeOutlet(value: string, currentValue: string) {
    if (value === currentValue) return

    const customerPaths = form
      .getValues("details")
      .map((_, index) => `details.${index}.customerId` as const)

    customerPaths.forEach((path) => {
      form.setValue(path, "", {
        shouldDirty: true,
        shouldValidate: false,
      })
    })
    form.setValue("outletId", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })
    void form.trigger(["outletId", ...customerPaths])
  }

  function onSubmit(values: assetLeaseSchemaType) {
    startTransition(async () => {
      const result = await assetLeaseStore(values)

      if (result.success) {
        toast.success(result.message)
        router.push("/distribution/asset-lease")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">Lease Info</h2>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="outletId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Outlet</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    options={outletItems}
                    value={field.value}
                    onValueChange={(value) => changeOutlet(value, field.value)}
                    placeholder="Select Outlet"
                    searchPlaceholder="Search outlet..."
                    emptyMessage="No outlet found"
                    disabled={!outletItems.length}
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
              name="note"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Note</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                    placeholder="Note"
                    autoComplete="off"
                    maxLength={255}
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

      <div className="rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-semibold">Lease Details</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => appendDetail(blankDetail())}
          >
            Add Detail
          </Button>
        </div>

        {form.formState.errors.details?.root && (
          <FieldError errors={[form.formState.errors.details.root]} />
        )}

        <div className="flex flex-col gap-4">
          {detailFields.map((detail, index) => (
            <AssetLeaseDetailSection
              key={detail.fieldId}
              index={index}
              control={form.control}
              errors={form.formState.errors}
              trigger={form.trigger}
              assetItems={assetItems}
              customerItems={customerItems}
              removeDetail={() => {
                removeDetail(index)
                void form.trigger("details")
              }}
              canRemove={detailFields.length > 1}
            />
          ))}
        </div>
      </div>

      <Field>
        <Button type="submit" disabled={isPending}>
          <LoadingSwap isLoading={isPending}>Create</LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
