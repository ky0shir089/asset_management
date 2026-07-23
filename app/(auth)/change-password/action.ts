"use server"

import { db } from "@/drizzle/db"
import { users } from "@/drizzle/schema"
import { auth } from "@/lib/auth/auth"
import {
  changePasswordSchema,
  changePasswordSchemaType,
} from "@/lib/formSchemas/auth-schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function changePassword(values: changePasswordSchemaType) {
  try {
    const { current_password, password_confirmation } =
      changePasswordSchema.parse(values)
    const requestHeaders = await headers()
    const currentSession = await auth.api.getSession({
      headers: requestHeaders,
    })

    const data = await auth.api.changePassword({
      body: {
        newPassword: password_confirmation,
        currentPassword: current_password,
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
    })

    if (!data) {
      return {
        success: false,
        message: "Failed to change password",
      }
    }

    if (currentSession?.user.id) {
      await db
        .update(users)
        .set({ changePassword: false })
        .where(eq(users.id, currentSession.user.id))
    }

    return {
      success: true,
      message: "Password changed successfully",
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to change password",
    }
  }
}
