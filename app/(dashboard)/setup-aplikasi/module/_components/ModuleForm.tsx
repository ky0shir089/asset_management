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
import { moduleShowType } from "@/data/module"
import { moduleSchema, moduleSchemaType } from "@/lib/formSchemas/module-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { moduleStore, moduleUpdate } from "../action"

interface iAppProps {
  data?: moduleShowType
}

export default function ModuleForm({ data }: iAppProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<moduleSchemaType>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: data?.name || "",
      icon: data?.icon || "",
      position: data?.position || 1,
    },
  })

  function onSubmit(values: moduleSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await moduleUpdate(data?.id, values)
        : await moduleStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/setup-aplikasi/module")
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
              <FieldLabel htmlFor={field.name}>Title</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Title"
                autoComplete="off"
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="icon"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Icon</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Icon"
                autoComplete="off"
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="position"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Position</FieldLabel>
              <Input
                {...field}
                type="number"
                id={field.name}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                aria-invalid={fieldState.invalid}
                placeholder="Position"
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
