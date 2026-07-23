"use server"

import { db } from "@/drizzle/db"
import { outlets } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import { outletSchema, outletSchemaType } from "@/lib/formSchemas/outlet-schema"
import { eq } from "drizzle-orm"

export async function outletStore(values: outletSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("outlet:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = outletSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(outlets).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Outlet created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function outletUpdate(id: string, values: outletSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("outlet:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = outletSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(outlets)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(outlets.id, id))

    return {
      success: true,
      message: "Outlet updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
