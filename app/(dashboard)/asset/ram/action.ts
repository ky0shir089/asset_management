"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { rams } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { ramSchema, ramSchemaType } from "@/lib/formSchemas/ram-schema"
import { eq } from "drizzle-orm"

export async function ramStore(values: ramSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("ram:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = ramSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(rams).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "RAM created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function ramUpdate(id: string, values: ramSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("ram:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = ramSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(rams)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(rams.id, id))

    return {
      success: true,
      message: "RAM updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
