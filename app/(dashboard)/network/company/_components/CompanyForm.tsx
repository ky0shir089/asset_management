"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { Switch } from "@/components/ui/switch"
import type { companyShowType } from "@/data/company"
import {
  companySchema,
  companySchemaType,
} from "@/lib/formSchemas/company-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { companyStore, companyUpdate } from "../action"

interface CompanyFormProps {
  data?: companyShowType
}

export default function CompanyForm({ data }: CompanyFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<companySchemaType>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: data?.name || "",
      code: data?.code || "",
      isActive: data?.isActive ?? true,
    },
  })

  function onSubmit(values: companySchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await companyUpdate(data.id, values)
        : await companyStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/network/company")
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

        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Code</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Code"
                autoComplete="off"
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="isActive"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Status</FieldLabel>
              <div className="flex items-center gap-2">
                <Switch
                  id={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  size="lg"
                />
                <span>{field.value ? "Active" : "Inactive"}</span>
              </div>
              <FieldContent>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>

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
