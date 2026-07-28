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
  assetLeaseCompanyOptionType,
} from "@/data/select"
import {
  assetLeaseSchema,
  type assetLeaseSchemaType,
} from "@/lib/formSchemas/asset-lease-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { assetLeaseStore } from "../action"
import AssetLeaseDetailSection from "./AssetLeaseDetailSection"

interface AssetLeaseFormProps {
  companies: assetLeaseCompanyOptionType[]
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
    amount: 0,
    photos: [] as File[],
  }
}

export default function AssetLeaseForm({
  companies,
  assets,
}: AssetLeaseFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<assetLeaseSchemaType>({
    resolver: zodResolver(assetLeaseSchema),
    defaultValues: {
      companyId: "",
      dateStart: jakartaToday(),
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

  const companyItems = companies.map(({ id, code, name }) => ({
    value: id,
    label: `${code} - ${name}`,
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

  function onSubmit(values: assetLeaseSchemaType) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("companyId", values.companyId)
      formData.set("dateStart", values.dateStart)
      if (values.note) formData.set("note", values.note)
      formData.set(
        "details",
        JSON.stringify(
          values.details.map(({ assetId, amount }) => ({ assetId, amount }))
        )
      )

      values.details.forEach((detail, index) => {
        detail.photos.forEach((file) =>
          formData.append(`photos-${index}`, file)
        )
      })

      const result = await assetLeaseStore(formData)

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
          <div className="grid gap-4 sm:grid-cols-3">
            <Controller
              name="companyId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Company</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    options={companyItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select Company"
                    searchPlaceholder="Search company..."
                    emptyMessage="No company found"
                    disabled={!companyItems.length}
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
              name="dateStart"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Rent Date</FieldLabel>
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
          <div>
            <h2 className="font-semibold">Lease Details</h2>
            <p className="text-sm text-muted-foreground">
              Up to 10 assets per lease.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => appendDetail(blankDetail())}
            disabled={detailFields.length >= 10}
          >
            Add Asset
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
