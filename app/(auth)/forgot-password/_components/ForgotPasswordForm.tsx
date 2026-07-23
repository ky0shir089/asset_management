"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { forgotPassword } from "../action"
import {
  forgotPasswordSchema,
  ForgotPasswordSchemaType,
} from "@/lib/formSchemas/auth-schema"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { useRouter } from "next/navigation"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isLoading, startTransition] = useTransition()

  const form = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      phoneNumber: "",
    },
  })

  function onSubmit(values: ForgotPasswordSchemaType) {
    startTransition(async () => {
      const result = await forgotPassword(values)

      if (result.success) {
        toast.success(result.message)
        form.reset()
        router.push("/reset-password")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your phone number and we&apos;ll send instructions to reset
            your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form
            id="forgot-password-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup>
              <Controller
                name="phoneNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Phone Number</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="08xxxxxxxx"
                      autoComplete="off"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>

        <CardFooter>
          <Field>
            <Button
              form="forgot-password-form"
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              <LoadingSwap isLoading={isLoading}>Send OTP</LoadingSwap>
            </Button>

            <div className="text-sm text-center">
              Remembered your password?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </Field>
        </CardFooter>
      </Card>
    </div>
  )
}
