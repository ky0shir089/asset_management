"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { banks } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { bankSchema, bankSchemaType } from "@/lib/formSchemas/bank-schema"
import { eq } from "drizzle-orm"

export async function bankStore(values: bankSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("bank:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = bankSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(banks).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Bank created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function bankUpdate(id: string, values: bankSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("bank:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = bankSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(banks)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(banks.id, id))

    return {
      success: true,
      message: "Bank updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
