"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { assetCodes, assetSpecs } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  assetCodeSchema,
  assetCodeSchemaType,
} from "@/lib/formSchemas/asset-code-schema"
import { eq } from "drizzle-orm"

const komputerCategoryId = "f8e6171b-5c36-4569-a28c-0d4f4dee50df"

const komputerDefaultAssetSpecNames = [
  "Merk",
  "Tipe",
  "Processor",
  "RAM",
  "Storage",
  "Keterangan",
]

const defaultAssetSpecNames = ["Merk", "Tipe", "Keterangan"]

function getDefaultAssetSpecNames(categoryId: string) {
  return categoryId === komputerCategoryId
    ? komputerDefaultAssetSpecNames
    : defaultAssetSpecNames
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  )
}

export async function assetCodeStore(values: assetCodeSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-code:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetCodeSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.transaction(async (tx) => {
      const [createdAssetCode] = await tx
        .insert(assetCodes)
        .values({
          ...validation.data,
          createdBy: user.id,
        })
        .returning({ id: assetCodes.id })

      await tx.insert(assetSpecs).values(
        getDefaultAssetSpecNames(validation.data.categoryId).map((name) => ({
          codeId: createdAssetCode.id,
          name,
          isRequired: true,
          createdBy: user.id,
        }))
      )
    })

    return {
      success: true,
      message: "Asset code created successfully",
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "Default asset specifications already exist for this asset code",
      }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function assetCodeUpdate(id: string, values: assetCodeSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-code:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetCodeSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(assetCodes)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(assetCodes.id, id))

    return {
      success: true,
      message: "Asset code updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
