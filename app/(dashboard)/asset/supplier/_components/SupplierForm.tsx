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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { bankOptionType, geographyOptionType } from "@/data/select"
import type { supplierShowType } from "@/data/supplier"
import {
  supplierSchema,
  supplierSchemaType,
} from "@/lib/formSchemas/supplier-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { supplierStore, supplierUpdate } from "../action"

interface SupplierFormProps {
  data?: supplierShowType
  banks: bankOptionType[]
  provinces: geographyOptionType[]
  initialHierarchy?: {
    provinceId: string
    regencyId: string
    districtId: string
  }
  initialRegencies?: geographyOptionType[]
  initialDistricts?: geographyOptionType[]
  initialVillages?: geographyOptionType[]
}

export default function SupplierForm({
  data,
  banks,
  provinces,
  initialHierarchy,
  initialRegencies = [],
  initialDistricts = [],
  initialVillages = [],
}: SupplierFormProps) {
  const [isPending, startTransition] = useTransition()
  const [regencies, setRegencies] = useState(initialRegencies)
  const [districts, setDistricts] = useState(initialDistricts)
  const [villages, setVillages] = useState(initialVillages)
  const [loadingField, setLoadingField] = useState<
    "regency" | "district" | "village" | null
  >(null)
  const requestController = useRef<AbortController | null>(null)
  const router = useRouter()
  const bankItems = banks.map((bank) => ({
    label: bank.name,
    value: bank.id,
  }))

  const form = useForm<supplierSchemaType>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: data?.name || "",
      address: data?.address || "",
      provinceId: initialHierarchy?.provinceId || "",
      regencyId: initialHierarchy?.regencyId || "",
      districtId: initialHierarchy?.districtId || "",
      villageId: data?.villageId || 0,
      accounts: data?.accounts?.length
        ? data.accounts.map((account) => ({
            id: account.id,
            bankId: account.bankId,
            accountNo: account.accountNo,
            accountName: account.accountName,
          }))
        : [
            {
              bankId: "",
              accountNo: "",
              accountName: "",
            },
          ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "accounts",
    keyName: "fieldId",
  })
  const provinceId = useWatch({ control: form.control, name: "provinceId" })
  const regencyId = useWatch({ control: form.control, name: "regencyId" })
  const districtId = useWatch({ control: form.control, name: "districtId" })

  useEffect(() => {
    return () => requestController.current?.abort()
  }, [])

  async function fetchOptions(
    field: "regency" | "district" | "village",
    params: URLSearchParams,
    setOptions: (options: geographyOptionType[]) => void
  ) {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    setLoadingField(field)

    try {
      const response = await fetch(`/api/geography?${params}`, {
        signal: controller.signal,
      })

      if (requestController.current !== controller) return

      if (!response.ok) {
        throw new Error()
      }

      setOptions(await response.json())
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setOptions([])
        toast.error("Failed to load location options")
      }
    } finally {
      if (requestController.current === controller) {
        setLoadingField(null)
      }
    }
  }

  function onSubmit(values: supplierSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await supplierUpdate(data.id, values)
        : await supplierStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/supplier")
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
      <div className="rounded-lg border p-4">
        <div className="mb-4">
          <h3 className="font-semibold">Supplier Details</h3>
          <p className="text-sm text-muted-foreground">
            Enter supplier identity and street address.
          </p>
        </div>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Supplier name"
                    autoComplete="organization"
                    required
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Street address"
                    autoComplete="street-address"
                    maxLength={255}
                    required
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
        <div className="mb-4">
          <h3 className="font-semibold">Location</h3>
          <p className="text-sm text-muted-foreground">
            Select each area in order to narrow the next field.
          </p>
        </div>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="provinceId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Province</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    triggerRef={field.ref}
                    options={provinces}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("regencyId", "")
                      form.setValue("districtId", "")
                      form.setValue("villageId", 0)
                      setRegencies([])
                      setDistricts([])
                      setVillages([])
                      fetchOptions(
                        "regency",
                        new URLSearchParams({ provinceId: value }),
                        setRegencies
                      )
                    }}
                    placeholder="Select province"
                    searchPlaceholder="Search province..."
                    emptyMessage="No province found"
                    disabled={!provinces.length}
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
              name="regencyId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Regency</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    triggerRef={field.ref}
                    options={regencies}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("districtId", "")
                      form.setValue("villageId", 0)
                      setDistricts([])
                      setVillages([])
                      fetchOptions(
                        "district",
                        new URLSearchParams({
                          provinceId: provinceId,
                          regencyId: value,
                        }),
                        setDistricts
                      )
                    }}
                    placeholder={
                      loadingField === "regency"
                        ? "Loading regencies..."
                        : "Select regency"
                    }
                    searchPlaceholder="Search regency..."
                    emptyMessage="No regency found"
                    disabled={!provinceId || loadingField === "regency"}
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
              name="districtId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>District</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    triggerRef={field.ref}
                    options={districts}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("villageId", 0)
                      setVillages([])
                      fetchOptions(
                        "village",
                        new URLSearchParams({
                          provinceId: provinceId,
                          regencyId: regencyId,
                          districtId: value,
                        }),
                        setVillages
                      )
                    }}
                    placeholder={
                      loadingField === "district"
                        ? "Loading districts..."
                        : "Select district"
                    }
                    searchPlaceholder="Search district..."
                    emptyMessage="No district found"
                    disabled={!regencyId || loadingField === "district"}
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
              name="villageId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Village</FieldLabel>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    triggerRef={field.ref}
                    options={villages}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(value) => field.onChange(Number(value))}
                    placeholder={
                      loadingField === "village"
                        ? "Loading villages..."
                        : "Select village"
                    }
                    searchPlaceholder="Search village or postal code..."
                    emptyMessage="No village found"
                    disabled={!districtId || loadingField === "village"}
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
        </FieldGroup>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Bank Accounts</h3>
            <p className="text-sm text-muted-foreground">
              Add one or more bank accounts for this supplier.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ bankId: "", accountNo: "", accountName: "" })
            }
          >
            <Plus data-icon="inline-start" />
            Add Account
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {fields.map((item, index) => (
            <div
              key={item.fieldId}
              className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start"
            >
              <Controller
                name={`accounts.${index}.bankId`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Bank</FieldLabel>
                    <Select
                      items={bankItems}
                      name={field.name}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      required
                      disabled={!banks.length}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        className="w-full"
                      >
                        <SelectValue placeholder="Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name={`accounts.${index}.accountNo`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Account No</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="Account No"
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
                name={`accounts.${index}.accountName`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Account Name</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="Account Name"
                      autoComplete="off"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="mt-0 lg:mt-7"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                aria-label={`Remove bank account ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Field>
        <Button type="submit" disabled={isPending}>
          <LoadingSwap isLoading={isPending}>
            {data?.id ? "Update" : "Create"}
          </LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
