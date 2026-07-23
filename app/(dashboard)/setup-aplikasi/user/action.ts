"use server"

import { db } from "@/drizzle/db"
import { roleUser, users } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import { userSchema, userSchemaType } from "@/lib/formSchemas/user-schema"
import { eq } from "drizzle-orm"

export async function userUpdate(id: string, values: userSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("user:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = userSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({
          changePassword: validation.data.changePassword,
        })
        .where(eq(users.id, id))
        .returning({ id: users.id })

      if (!updatedUser) {
        return null
      }

      await tx
        .update(roleUser)
        .set({
          roleId: validation.data.roleId,
          updatedBy: user.id,
        })
        .where(eq(roleUser.userId, id))
    })

    return {
      success: true,
      message: "user updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
