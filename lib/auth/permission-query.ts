import "server-only"

import { db } from "@/drizzle/db"
import { permissionRole, permissions, roleUser } from "@/drizzle/schema"
import { and, eq, inArray } from "drizzle-orm"

export async function isSuperAdmin(userId: string) {
  const userRoles = await db.query.roleUser.findMany({
    where: and(eq(roleUser.userId, userId), eq(roleUser.isActive, true)),
    with: {
      role: true,
    },
  })

  return userRoles.some(
    (userRole) => userRole.role.name === "Super Administrator"
  )
}

export async function getUserPermissionNames(userId: string) {
  const userRoles = await db.query.roleUser.findMany({
    columns: {
      roleId: true,
    },
    where: and(eq(roleUser.userId, userId), eq(roleUser.isActive, true)),
  })

  const roleIds = userRoles.map((role) => role.roleId)

  if (!roleIds.length) {
    return []
  }

  const rows = await db
    .select({
      name: permissions.name,
    })
    .from(permissionRole)
    .innerJoin(permissions, eq(permissionRole.permissionId, permissions.id))
    .where(inArray(permissionRole.roleId, roleIds))

  return Array.from(new Set(rows.map((row) => row.name)))
}
