"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { assetCodes, assetSpecs } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  assetSpecSchema,
  assetSpecSchemaType,
} from "@/lib/formSchemas/asset-spec-schema"
import { eq, ilike, or } from "drizzle-orm"

export async function searchAssetCodes(query = "") {
  await requireUser()

  const search = query.trim()
  const isSearching = search.length >= 3

  return db.query.assetCodes.findMany({
    columns: {
      id: true,
      code: true,
      name: true,
    },
    where: isSearching
      ? or(
          ilike(assetCodes.code, `%${search}%`),
          ilike(assetCodes.name, `%${search}%`)
        )
      : undefined,
    orderBy: (assetCodes, { asc }) => [
      asc(assetCodes.code),
      asc(assetCodes.name),
    ],
    limit: isSearching ? 20 : 10,
  })
}

export async function assetSpecStore(values: assetSpecSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-specification:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetSpecSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(assetSpecs).values({
      codeId: validation.data.codeId,
      name: validation.data.name,
      type: validation.data.type,
      dataTable: validation.data.dataTable,
      isRequired: validation.data.isRequired,
      createable: validation.data.createable,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Asset spec created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function assetSpecUpdate(id: string, values: assetSpecSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-specification:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetSpecSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(assetSpecs)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(assetSpecs.id, id))

    return {
      success: true,
      message: "Asset spec updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
