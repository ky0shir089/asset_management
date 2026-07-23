"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { purchaseRequestShowType } from "@/data/purchase-request"
import type {
  assetCategoryOptionType,
  assetCodeOptionType,
  assetSpecOptionType,
  assetSpecValueOptionType,
  companyOptionType,
} from "@/data/select"
import {
  purchaseRequestSchema,
  purchaseRequestSchemaType,
} from "@/lib/formSchemas/purchase-request-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { purchaseRequestStore, purchaseRequestUpdate } from "../action"
import PurchaseRequestDetailSection from "./PurchaseRequestDetailSection"

interface PurchaseRequestFormProps {
  data?: purchaseRequestShowType
  companies: companyOptionType[]
  categories: assetCategoryOptionType[]
  codes: assetCodeOptionType[]
  specs: assetSpecOptionType[]
  specValues: assetSpecValueOptionType[]
}

function getToday() {
  return new Date().toISOString().split("T")[0]
}

export default function PurchaseRequestForm({
  data,
  companies,
  categories,
  codes,
  specs,
  specValues,
}: PurchaseRequestFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const companyItems = companies.map((c) => ({
    label: c.code,
    value: c.id,
  }))

  const categoryItems = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }))

  function buildDetailSpecifications(
    assetCodeId: string,
    existingSpecifications: {
      id?: string
      specId: string
      specValue: string | null
    }[] = []
  ) {
    const existingBySpecId = new Map(
      existingSpecifications.map((spec) => [spec.specId, spec])
    )

    return specs
      .filter((spec) => spec.codeId === assetCodeId)
      .map((spec) => {
        const existing = existingBySpecId.get(spec.id)

        return {
          id: existing?.id,
          specId: spec.id,
          specValue: existing?.specValue ?? "",
        }
      })
  }

  const form = useForm<purchaseRequestSchemaType>({
    resolver: zodResolver(purchaseRequestSchema),
    defaultValues: {
      date: data?.date ?? getToday(),
      companyId: data?.companyId ?? "",
      assetCategoryId: data?.assetCategoryId ?? "",
      description: data?.description ?? "",
      details: data?.details?.length
        ? data.details.map((d) => ({
            id: d.id,
            assetCodeId: d.assetCodeId,
            price: d.price ?? 0,
            quantity: d.quantity ?? 0,
            specifications: buildDetailSpecifications(
              d.assetCodeId,
              d.specifications ?? []
            ),
          }))
        : [
            {
              assetCodeId: "",
              price: 0,
              quantity: 1,
              specifications: [],
            },
          ],
    },
  })

  const selectedAssetCategoryId = useWatch({
    control: form.control,
    name: "assetCategoryId",
  })
  const filteredCodes = selectedAssetCategoryId
    ? codes.filter((code) => code.categoryId === selectedAssetCategoryId)
    : []
  const codeItems = filteredCodes.map((c) => ({
    label: `${c.code} - ${c.name}`,
    value: c.id,
  }))

  const filteredSpecs = specs.filter((spec) =>
    filteredCodes.some((code) => code.id === spec.codeId)
  )

  const {
    fields: detailFields,
    append: appendDetail,
    remove: removeDetail,
  } = useFieldArray({
    control: form.control,
    name: "details",
    keyName: "fieldId",
  })

  function clearDetailAssetCodes() {
    const details = form.getValues("details")
    form.setValue(
      "details",
      details.map((detail) => ({
        ...detail,
        assetCodeId: "",
        specifications: [],
      })),
      { shouldDirty: true, shouldValidate: true }
    )
  }

  function onSubmit(values: purchaseRequestSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await purchaseRequestUpdate(data.id, values)
        : await purchaseRequestStore(values)

      if (result.success) {
        toast.success(result.message)
        router.push("/asset-transaction/purchase-request")
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
      {/* Request Info */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Request Info</h3>
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
                    placeholder="Company"
                    searchPlaceholder="Search company..."
                    emptyMessage="No company found"
                    disabled={!companies.length}
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
              name="assetCategoryId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Asset Category</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    options={categoryItems}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value !== field.value) {
                        field.onChange(value)
                        clearDetailAssetCodes()
                      }
                    }}
                    placeholder="Asset Category"
                    searchPlaceholder="Search asset category..."
                    emptyMessage="No category found"
                    disabled={!categories.length}
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
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </div>

      {/* Asset Details */}
      <div className="rounded-lg border p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Asset Details</h3>
            <p className="text-muted-foreground text-sm">
              Add one or more asset codes for this purchase request.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendDetail({
                assetCodeId: "",
                price: 0,
                quantity: 1,
                specifications: [],
              })
            }
          >
            <Plus data-icon="inline-start" />
            Add Asset Code
          </Button>
        </div>

        {form.formState.errors.details?.root && (
          <p className="mb-2 text-sm text-destructive">
            {form.formState.errors.details.root.message}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {detailFields.map((item, index) => (
            <PurchaseRequestDetailSection
              key={item.fieldId}
              index={index}
              control={form.control}
              codes={filteredCodes}
              specs={filteredSpecs}
              specValues={specValues}
              codeItems={codeItems}
              selectedAssetCategoryId={selectedAssetCategoryId}
              removeDetail={() => removeDetail(index)}
              canRemove={detailFields.length > 1}
              errors={form.formState.errors}
            />
          ))}
        </div>
      </div>

      <Field>
        <Button type="submit" id="form" disabled={isPending}>
          <LoadingSwap isLoading={isPending}>
            {data?.id ? "Update" : "Create"}
          </LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
