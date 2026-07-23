"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  menuRole as menuRoleTable,
  permissionRole as permissionRoleTable,
  roles,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { roleSchema, type roleSchemaType } from "@/lib/formSchemas/role-schema"
import { eq } from "drizzle-orm"

export async function roleStore(values: roleSchemaType) {
  try {
    const user = await requireUser()
    const permission = await authorizeAction("role:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = roleSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    await db.transaction(async (tx) => {
      const selectedPermissions = validation.data.permissions ?? []

      const [role] = await tx
        .insert(roles)
        .values({
          name: validation.data.name,
          createdBy: user.id,
        })
        .returning()

      const menuRoleValues = validation.data.menus.map((item) => {
        return {
          roleId: role.id,
          menuId: item,
          createdBy: user.id,
        }
      })

      await tx.insert(menuRoleTable).values(menuRoleValues)

      const permissionRoleValues = selectedPermissions.map((item) => {
        return {
          roleId: role.id,
          permissionId: item,
        }
      })

      if (permissionRoleValues.length) {
        await tx.insert(permissionRoleTable).values(permissionRoleValues)
      }
    })

    return {
      success: true,
      message: "Role created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function roleUpdate(id: string, values: roleSchemaType) {
  try {
    const user = await requireUser()
    const permission = await authorizeAction("role:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = roleSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    const result = await db.transaction(async (tx) => {
      const selectedPermissions = validation.data.permissions ?? []

      const [role] = await tx
        .update(roles)
        .set({
          name: validation.data.name,
          updatedBy: user.id,
        })
        .where(eq(roles.id, id))
        .returning({ id: roles.id })

      if (!role) {
        return null
      }

      await tx.delete(menuRoleTable).where(eq(menuRoleTable.roleId, id))

      await tx
        .delete(permissionRoleTable)
        .where(eq(permissionRoleTable.roleId, id))

      const menuRoleValues = validation.data.menus.map((item) => {
        return {
          roleId: role.id,
          menuId: item,
          createdBy: user.id,
        }
      })

      await tx.insert(menuRoleTable).values(menuRoleValues)

      const permissionRoleValues = selectedPermissions.map((item) => {
        return {
          roleId: role.id,
          permissionId: item,
        }
      })

      if (permissionRoleValues.length) {
        await tx.insert(permissionRoleTable).values(permissionRoleValues)
      }

      return role
    })

    if (!result) {
      return {
        success: false,
        message: "Role not found",
      }
    }

    return {
      success: true,
      message: "Role updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
