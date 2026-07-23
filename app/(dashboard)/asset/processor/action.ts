"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { processors } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  processorSchema,
  processorSchemaType,
} from "@/lib/formSchemas/processor-schema"
import { eq } from "drizzle-orm"

export async function processorStore(values: processorSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("processor:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = processorSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(processors).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Processor created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function processorUpdate(
  id: string,
  values: processorSchemaType
) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("processor:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = processorSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(processors)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(processors.id, id))

    return {
      success: true,
      message: "Processor updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
