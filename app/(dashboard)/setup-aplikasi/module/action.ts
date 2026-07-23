"use server"

import { db } from "@/drizzle/db"
import { modules } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import { moduleSchema, moduleSchemaType } from "@/lib/formSchemas/module-schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function moduleStore(values: moduleSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("module:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = moduleSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(modules).values({
      ...validation.data,
      createdBy: user.id,
    })

    revalidatePath("/setup-aplikasi/module")

    return {
      success: true,
      message: "Module created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function moduleUpdate(id: string, values: moduleSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("module:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = moduleSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(modules)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(modules.id, id))

    revalidatePath("/setup-aplikasi/module")

    return {
      success: true,
      message: "Module updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
