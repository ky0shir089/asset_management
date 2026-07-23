"use server"

import { db } from "@/drizzle/db"
import { branches } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import { branchSchema, branchSchemaType } from "@/lib/formSchemas/branch-schema"
import { eq } from "drizzle-orm"

export async function branchStore(values: branchSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("branch:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = branchSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(branches).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Branch created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function branchUpdate(id: string, values: branchSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("branch:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = branchSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(branches)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(branches.id, id))

    return {
      success: true,
      message: "Branch updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
