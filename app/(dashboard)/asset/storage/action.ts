"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { storages } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  storageSchema,
  storageSchemaType,
} from "@/lib/formSchemas/storage-schema"
import { eq } from "drizzle-orm"

export async function storageStore(values: storageSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("storage:add")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = storageSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(storages).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Storage created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function storageUpdate(id: string, values: storageSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("storage:edit")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = storageSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(storages)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(storages.id, id))

    return {
      success: true,
      message: "Storage updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
