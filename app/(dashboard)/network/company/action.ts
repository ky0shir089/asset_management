"use server"

import { db } from "@/drizzle/db"
import { companies } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import { companySchema, companySchemaType } from "@/lib/formSchemas/company-schema"
import { eq } from "drizzle-orm"

export async function companyStore(values: companySchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("company:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = companySchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.insert(companies).values({
      ...validation.data,
      createdBy: user.id,
    })

    return {
      success: true,
      message: "Company created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function companyUpdate(id: string, values: companySchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("company:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = companySchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db
      .update(companies)
      .set({
        ...validation.data,
        updatedBy: user.id,
      })
      .where(eq(companies.id, id))

    return {
      success: true,
      message: "Company updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
