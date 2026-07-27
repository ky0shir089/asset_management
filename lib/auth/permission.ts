import "server-only"

import { requireSession } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { sessions } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { cache } from "react"
export { getUserPermissionNames } from "./permission-query"

export const UNAUTHORIZED_RESPONSE = {
  success: false,
  message: "Unauthorized",
} as const

export async function getSessionPermissions() {
  const session = await requireSession()

  const data = await db.query.sessions.findFirst({
    columns: {
      permissions: true,
    },
    where: eq(sessions.id, session.session.id),
  })

  return data?.permissions ?? []
}

export async function can(permissionName: string) {
  const permissionNames = await getSessionPermissions()

  return permissionNames.includes(permissionName)
}

export const requirePermission = cache(async (permissionName: string) => {
  const authorized = await can(permissionName)

  if (!authorized) {
    redirect("/unauthorized")
  }
})

export async function authorizeAction(permissionName: string) {
  const authorized = await can(permissionName)

  if (!authorized) {
    return {
      authorized: false,
      response: UNAUTHORIZED_RESPONSE,
    } as const
  }

  return {
    authorized: true,
  } as const
}
