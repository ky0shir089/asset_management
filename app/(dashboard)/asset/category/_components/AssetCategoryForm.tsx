"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import type { assetCategoryShowType } from "@/data/asset-category"
import {
  assetCategorySchema,
  assetCategorySchemaType,
} from "@/lib/formSchemas/asset-category-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { assetCategoryStore, assetCategoryUpdate } from "../action"

interface AssetCategoryFormProps {
  data?: assetCategoryShowType
}

export default function AssetCategoryForm({ data }: AssetCategoryFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<assetCategorySchemaType>({
    resolver: zodResolver(assetCategorySchema),
    defaultValues: {
      name: data?.name || "",
    },
  })

  function onSubmit(values: assetCategorySchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await assetCategoryUpdate(data.id, values)
        : await assetCategoryStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/category")
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
