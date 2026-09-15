"use server"

import { db } from "@/drizzle/db"
import { menus, permissions } from "@/drizzle/schema"
import { requireUser } from "@/data/require-user"
import { authorizeAction } from "@/lib/auth/permission"
import { menuSchema, type menuSchemaType } from "@/lib/formSchemas/menu-schema"
import { eq } from "drizzle-orm"

export async function menuStore(values: menuSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("menu:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = menuSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.transaction(async (tx) => {
      const permissionKey = validation.data.key ?? ""

      const [menu] = await tx
        .insert(menus)
        .values({
          ...validation.data,
          createdBy: user.id,
        })
        .returning()

      if (permissionKey) {
        await tx.insert(permissions).values([
          {
            menuId: menu.id,
            name: `${permissionKey}:browse`,
          },
          {
            menuId: menu.id,
            name: `${permissionKey}:read`,
          },
          {
            menuId: menu.id,
            name: `${permissionKey}:edit`,
          },
          {
            menuId: menu.id,
            name: `${permissionKey}:add`,
          },
          {
            menuId: menu.id,
            name: `${permissionKey}:delete`,
          },
        ])
      }
    })

    return {
      success: true,
      message: "Menu created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function menuUpdate(id: string, values: menuSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("menu:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = menuSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.transaction(async (tx) => {
      const permissionKey = validation.data.key ?? ""

      const [menu] = await tx
        .update(menus)
        .set({
          ...validation.data,
          updatedBy: user.id,
        })
        .where(eq(menus.id, id))
        .returning()

      const fetchPermissions = await tx.query.permissions.findMany({
        where: eq(permissions.menuId, menu.id),
        orderBy: [permissions.id],
      })

      if (!fetchPermissions) {
        return
      }

      await Promise.all(
        fetchPermissions.map((item) => {
          const permissionAction = item.name.split(":").at(-1) ?? item.name

          return tx
            .update(permissions)
            .set({
              name: `${permissionKey}:${permissionAction}`,
            })
            .where(eq(permissions.id, item.id))
        })
      )
    })

    return {
      success: true,
      message: "Menu updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
