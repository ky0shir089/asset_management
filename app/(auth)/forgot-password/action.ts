"use server"

import { auth } from "@/lib/auth/auth"
import {
  forgotPasswordSchema,
  ForgotPasswordSchemaType,
} from "@/lib/formSchemas/auth-schema"

export async function forgotPassword(values: ForgotPasswordSchemaType) {
  const { phoneNumber } = forgotPasswordSchema.parse(values)

  try {
    const data = await auth.api.requestPasswordResetPhoneNumber({
      body: {
        phoneNumber,
      },
    })

    if(!data){
      return {
        success: false,
        message: "Failed to send OTP",
      }
    }

    return {
      success: true,
      message: "OTP sent successfully",
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send OTP",
    }
  }
}
