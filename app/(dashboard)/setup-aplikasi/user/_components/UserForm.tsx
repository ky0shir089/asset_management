"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { LoadingSwap } from "@/components/ui/loading-swap"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { roleOptionType } from "@/data/select"
import type { userShowType } from "@/data/user"
import { userSchema, userSchemaType } from "@/lib/formSchemas/user-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { userUpdate } from "../action"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserFormProps {
  data: userShowType
  roles: roleOptionType[]
}

export default function UserForm({ data, roles }: UserFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<userSchemaType>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      changePassword: data.changePassword ?? false,
      roleId: data.roleUser[0]?.roleId ?? "",
    },
  })

  function onSubmit(values: userSchemaType) {
    startTransition(async () => {
      const result = await userUpdate(data.id, values)

      if (result.success) {
        form.reset(values)
        toast.success(result.message)
        router.push("/setup-aplikasi/user")
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
        <div className="flex flex-col justify-between gap-2">
          <Label>ID</Label>
          <Input value={data.username!} readOnly />
        </div>

        <div className="flex flex-col justify-between gap-2">
          <Label>Name</Label>
          <Input value={data.name} readOnly />
        </div>

        <Controller
          name="roleId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Role</FieldLabel>
              <Select
                name={field.name}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? "")}
                required
                disabled={!roles.length}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
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
          name="changePassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Change Password</FieldLabel>
              <div className="flex items-center gap-2">
                <Switch
                  id={field.name}
                  size="lg"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                <span>{field.value ? "YES" : "NO"}</span>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Field>
        <Button type="submit" disabled={isPending}>
          <LoadingSwap isLoading={isPending}>Update</LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
