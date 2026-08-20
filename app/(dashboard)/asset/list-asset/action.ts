"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { maintenances } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  maintenanceSchema,
  type maintenanceSchemaType,
} from "@/lib/formSchemas/maintenance-schema"
import { revalidatePath } from "next/cache"
import DOMPurify from "dompurify"

function sanitizeHtml(html: string): string {
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(html)
  }
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:[^"']*/gi, "")
}

export async function createMaintenanceAction(values: maintenanceSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("received-asset:browse")
    if (!permission.authorized) return permission.response

    const validation = maintenanceSchema.safeParse(values)
    if (!validation.success) {
      return { success: false, message: "Data form tidak valid" }
    }

    const cleanDetail = sanitizeHtml(validation.data.detail)

    const [inserted] = await db
      .insert(maintenances)
      .values({
        assetId: validation.data.assetId,
        detail: cleanDetail,
        amount: validation.data.amount,
        createdBy: user.id,
      })
      .returning({ id: maintenances.id })

    revalidatePath("/asset/list-asset")
    return {
      success: true,
      message: "Maintenance berhasil dicatat",
      id: inserted.id,
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal mencatat maintenance",
    }
  }
}
