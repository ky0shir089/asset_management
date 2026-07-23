"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { bankOptionType } from "@/data/select"
import type { supplierShowType } from "@/data/supplier"
import {
  supplierSchema,
  supplierSchemaType,
} from "@/lib/formSchemas/supplier-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { supplierStore, supplierUpdate } from "../action"

interface SupplierFormProps {
  data?: supplierShowType
  banks: bankOptionType[]
}

export default function SupplierForm({ data, banks }: SupplierFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const bankItems = banks.map((bank) => ({
    label: bank.name,
    value: bank.id,
  }))

  const form = useForm<supplierSchemaType>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: data?.name || "",
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
      <FieldGroup>
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
                placeholder="Name"
                autoComplete="off"
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="rounded-lg border p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Bank Accounts</h3>
            <p className="text-muted-foreground text-sm">
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
              >
                <Trash2 />
              </Button>
            </div>
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
