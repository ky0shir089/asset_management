import { z } from "zod"

export const signInSchema = z.object({
  username: z.string().min(5),
  password: z.string().min(8),
})
export type signInSchemaType = z.infer<typeof signInSchema>

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(8),
    password: z.string().min(8),
    password_confirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  })
export type changePasswordSchemaType = z.infer<typeof changePasswordSchema>

export const forgotPasswordSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number is required"),
})
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    otp: z.string().min(6),
    phoneNumber: z.string().min(10, "Phone number is required"),
    password: z.string().min(8),
    password_confirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  })
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema>
