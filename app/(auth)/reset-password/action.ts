"use server"

import { auth } from "@/lib/auth/auth"
import { resetPasswordSchema, resetPasswordSchemaType } from "@/lib/formSchemas/auth-schema"

export async function resetPassword(values: resetPasswordSchemaType) {
  const { otp, phoneNumber, password_confirmation } =
    resetPasswordSchema.parse(values)

  try {
    const data = await auth.api.resetPasswordPhoneNumber({
      body: {
        otp,
        phoneNumber,
        newPassword: password_confirmation,
      },
    })

    if (!data) {
      return {
        success: false,
        message: "Invalid OTP",
      }
    }

    return {
      success: true,
      message: "Password reset successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to reset password",
    }
  }
}
