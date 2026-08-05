"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { assetLeaseCompanyOptionType } from "@/data/select"
import {
  standaloneAssetTransferSchema,
  type standaloneAssetTransferSchemaType,
} from "@/lib/formSchemas/asset-transfer-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import {
  getStandaloneTransferOptions,
  standaloneAssetTransferStore,
} from "../action"

type TransferOptions = Extract<
  Awaited<ReturnType<typeof getStandaloneTransferOptions>>,
  { success: true }
>["data"]

function jakartaToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export default function AssetTransferForm({
  companies,
}: {
  companies: assetLeaseCompanyOptionType[]
}) {
  const router = useRouter()
  const requestId = useRef(0)
  const [options, setOptions] = useState<TransferOptions>({
    assets: [],
    users: [],
    categories: [],
  })
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<standaloneAssetTransferSchemaType>({
    resolver: zodResolver(standaloneAssetTransferSchema),
    defaultValues: {
      companyId: "",
      assetId: "",
      transferDate: jakartaToday(),
      userId: "",
      expectedOutletId: "",
      expectedTransferId: null,
    },
  })

  const companyItems = companies.map(({ id, code, name }) => ({
    value: id,
    label: `${code} - ${name}`,
  }))

  const companyId = useWatch({ control: form.control, name: "companyId" })

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [selectedCodeId, setSelectedCodeId] = useState<string>("")

  // Only run when options change (reset selections if company changes)
  const categoryItems = options.categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))

  const codeItems = Array.from(
    new Map(
      options.assets
        .filter((asset) => !selectedCategoryId || asset.categoryId === selectedCategoryId)
        .map((asset) => [
          asset.assetCodeId,
          {
            value: asset.assetCodeId,
            label: `${asset.assetCode} - ${asset.assetName}`,
          },
        ])
    ).values()
  )

  const assetItems = options.assets
    .filter((asset) => {
      if (selectedCategoryId && asset.categoryId !== selectedCategoryId) return false
      if (selectedCodeId && asset.assetCodeId !== selectedCodeId) return false
      return true
    })
    .map((asset) => ({
      value: asset.id,
      label: asset.nomorAssets,
    }))

  const userItems = options.users.map((user) => ({
    value: user.id,
    label: `${user.name} - ${user.outletName}`,
  }))

  async function loadOptions(companyId: string) {
    const currentRequest = ++requestId.current
    setOptions({ assets: [], users: [], categories: [] })
    setSelectedCategoryId("")
    setSelectedCodeId("")
    form.setValue("assetId", "")
    form.setValue("userId", "")
    form.setValue("expectedOutletId", "")
    form.setValue("expectedTransferId", null)
    if (!companyId) return

    setIsLoadingOptions(true)
    try {
      const result = await getStandaloneTransferOptions(companyId)
      if (currentRequest !== requestId.current) return
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setOptions(result.data)
    } catch (error) {
      if (currentRequest === requestId.current) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      }
    } finally {
      if (currentRequest === requestId.current) {
        setIsLoadingOptions(false)
      }
    }
  }

  function onSubmit(values: standaloneAssetTransferSchemaType) {
    startTransition(async () => {
      try {
        const result = await standaloneAssetTransferStore(values)
        if (!result.success) {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        router.push("/distribution/asset-transfer")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="companyId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Company</FieldLabel>
                <SearchableSelect
                  id={field.name}
                  name={field.name}
                  triggerRef={field.ref}
                  options={companyItems}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    void loadOptions(value)
                  }}
                  placeholder="Select company"
                  searchPlaceholder="Search company..."
                  emptyMessage="No non-LSA company found"
                  disabled={isPending || !companyItems.length}
                  required
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Only active companies outside LSA appear.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="transferDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Transfer Date</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="date"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  required
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field>
            <FieldLabel>Asset Category</FieldLabel>
            <SearchableSelect
              options={categoryItems}
              value={selectedCategoryId}
              onValueChange={(value) => {
                setSelectedCategoryId(value)
                setSelectedCodeId("")
                form.setValue("assetId", "")
              }}
              placeholder={
                isLoadingOptions ? "Loading categories..." : "Filter by category"
              }
              searchPlaceholder="Search category..."
              emptyMessage="No category found"
              disabled={isPending || isLoadingOptions || !companyId}
            />
          </Field>

          <Field>
            <FieldLabel>Asset Code</FieldLabel>
            <SearchableSelect
              options={codeItems}
              value={selectedCodeId}
              onValueChange={(value) => {
                setSelectedCodeId(value)
                form.setValue("assetId", "")
              }}
              placeholder={
                isLoadingOptions ? "Loading codes..." : "Filter by code"
              }
              searchPlaceholder="Search code..."
              emptyMessage="No code found"
              disabled={isPending || isLoadingOptions || !companyId}
            />
          </Field>

          <Controller
            name="assetId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Asset</FieldLabel>
                <SearchableSelect
                  id={field.name}
                  name={field.name}
                  triggerRef={field.ref}
                  options={assetItems}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    const asset = options.assets.find((item) => item.id === value)
                    form.setValue("expectedOutletId", asset?.outletId ?? "")
                    form.setValue(
                      "expectedTransferId",
                      asset?.expectedTransferId ?? null
                    )
                  }}
                  placeholder={
                    isLoadingOptions ? "Loading assets..." : "Select asset"
                  }
                  searchPlaceholder="Search asset..."
                  emptyMessage="No available asset found for this company"
                  disabled={
                    isPending || isLoadingOptions || !companyId
                  }
                  required
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Only TERSEDIA assets currently located in selected company appear.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="userId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Assigned User</FieldLabel>
                <SearchableSelect
                  id={field.name}
                  name={field.name}
                  triggerRef={field.ref}
                  options={userItems}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={
                    isLoadingOptions ? "Loading users..." : "Select user"
                  }
                  searchPlaceholder="Search user..."
                  emptyMessage="No assigned user found for this company"
                  disabled={
                    isPending || isLoadingOptions || !companyId
                  }
                  required
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Asset moves to selected user&apos;s current outlet.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <Field>
        <Button type="submit" disabled={isPending || isLoadingOptions}>
          <LoadingSwap isLoading={isPending}>Transfer Asset</LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
