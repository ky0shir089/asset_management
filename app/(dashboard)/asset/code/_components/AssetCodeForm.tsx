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
import type { assetCodeShowType } from "@/data/asset-code"
import type { assetCategoryOptionType } from "@/data/select"
import {
  assetCodeSchema,
  assetCodeSchemaType,
} from "@/lib/formSchemas/asset-code-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { assetCodeStore, assetCodeUpdate } from "../action"

interface AssetCodeFormProps {
  data?: assetCodeShowType
  categories: assetCategoryOptionType[]
}

export default function AssetCodeForm({ data, categories }: AssetCodeFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const categoryItems = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }))

  const form = useForm<assetCodeSchemaType>({
    resolver: zodResolver(assetCodeSchema),
    defaultValues: {
      categoryId: data?.categoryId || "",
      code: data?.code || "",
      name: data?.name || "",
    },
  })

  function onSubmit(values: assetCodeSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await assetCodeUpdate(data.id, values)
        : await assetCodeStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/code")
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
          name="categoryId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Asset Category</FieldLabel>
              <Select
                items={categoryItems}
                name={field.name}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? "")}
                required
                disabled={!categories.length}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Asset Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
