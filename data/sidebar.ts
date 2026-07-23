import "server-only"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { menuRole, menus, modules, roleUser } from "@/drizzle/schema"
import { and, asc, eq, inArray } from "drizzle-orm"

export type SidebarMenu = {
  id: string
  name: string
  path: string
  position: number
}

export type SidebarModule = {
  icon: string
  name: string
  id: string
  menus: SidebarMenu[]
}

export async function getSidebarNavForCurrentUser(): Promise<SidebarModule[]> {
  const user = await requireUser()

  const userRoles = await db.query.roleUser.findMany({
    columns: {
      roleId: true,
    },
    where: eq(roleUser.userId, user.id),
  })

  const roleIds = userRoles.map((role) => role.roleId)

  if (!roleIds.length) {
    return []
  }

  const rows = await db
    .select({
      moduleId: modules.id,
      moduleName: modules.name,
      moduleIcon: modules.icon,
      menuId: menus.id,
      menuName: menus.name,
      menuPath: menus.path,
      menuPosition: menus.position,
    })
    .from(menuRole)
    .innerJoin(menus, eq(menuRole.menuId, menus.id))
    .innerJoin(modules, eq(menus.moduleId, modules.id))
    .where(
      and(
        inArray(menuRole.roleId, roleIds),
        eq(menuRole.isActive, true),
        eq(menus.isActive, true)
      )
    )
    .orderBy(
      asc(modules.position),
      asc(menus.position),
      asc(menus.name),
      asc(menus.id)
    )

  const moduleMap = new Map<string, SidebarModule>()

  for (const row of rows) {
    const existingModule = moduleMap.get(row.moduleId)

    const sidebarModule = existingModule ?? {
      icon: row.moduleIcon ?? "",
      name: row.moduleName,
      id: row.moduleId,
      menus: [],
    }

    if (!sidebarModule.menus.some((menu) => menu.id === row.menuId)) {
      sidebarModule.menus.push({
        id: row.menuId,
        name: row.menuName,
        path: row.menuPath,
        position: row.menuPosition,
      })
    }

    if (!existingModule) {
      moduleMap.set(row.moduleId, sidebarModule)
    }
  }

  return Array.from(moduleMap.values())
}
