"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { assetBrands } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  assetBrandSchema,
  assetBrandSchemaType,
} from "@/lib/formSchemas/asset-brand-schema"
import { eq } from "drizzle-orm"

export async function assetBrandStore(values: assetBrandSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-brand:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetBrandSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(assetBrands).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Asset brand created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function assetBrandUpdate(id: string, values: assetBrandSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-brand:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetBrandSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(assetBrands)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(assetBrands.id, id))

    return {
      success: true,
      message: "Asset brand updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
