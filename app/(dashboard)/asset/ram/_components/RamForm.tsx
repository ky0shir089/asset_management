"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import type { ramShowType } from "@/data/ram"
import { ramSchema, ramSchemaType } from "@/lib/formSchemas/ram-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ramStore, ramUpdate } from "../action"

interface RamFormProps {
  data?: ramShowType
}

export default function RamForm({ data }: RamFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<ramSchemaType>({
    resolver: zodResolver(ramSchema),
    defaultValues: {
      name: data?.name || "",
    },
  })

  function onSubmit(values: ramSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await ramUpdate(data.id, values)
        : await ramStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/ram")
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
