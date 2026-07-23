"use server"

import { db } from "@/drizzle/db"
import { assetCategories } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import {
  assetCategorySchema,
  assetCategorySchemaType,
} from "@/lib/formSchemas/asset-category-schema"
import { eq } from "drizzle-orm"

export async function assetCategoryStore(values: assetCategorySchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-category:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetCategorySchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(assetCategories).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Asset category created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function assetCategoryUpdate(
  id: string,
  values: assetCategorySchemaType
) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-category:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetCategorySchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(assetCategories)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(assetCategories.id, id))

    return {
      success: true,
      message: "Asset category updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
