"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { supplierAccounts, suppliers, villages } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  supplierSchema,
  supplierSchemaType,
} from "@/lib/formSchemas/supplier-schema"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function isValidLocation(values: supplierSchemaType) {
  const village = await db.query.villages.findFirst({
    where: and(
      eq(villages.id, values.villageId),
      eq(villages.provinceId, values.provinceId),
      eq(villages.regencyId, values.regencyId),
      eq(villages.districtId, values.districtId)
    ),
    columns: { id: true },
  })

  return Boolean(village)
}

export async function supplierStore(values: supplierSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("supplier:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = supplierSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    if (!(await isValidLocation(validation.data))) {
      return {
        success: false,
        message: "Invalid location",
      }
    }

    await db.transaction(async (tx) => {
      const [supplier] = await tx
        .insert(suppliers)
        .values({
          name: validation.data.name,
          address: validation.data.address,
          villageId: validation.data.villageId,
          createdBy: user.id,
        })
        .returning()

      await tx.insert(supplierAccounts).values(
        validation.data.accounts.map((account) => ({
          supplierId: supplier.id,
          bankId: account.bankId,
          accountNo: account.accountNo,
          accountName: account.accountName,
          createdBy: user.id,
        }))
      )
    })

    revalidatePath("/asset/supplier")

    return {
      success: true,
      message: "Supplier created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function supplierUpdate(id: string, values: supplierSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("supplier:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = supplierSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    if (!(await isValidLocation(validation.data))) {
      return {
        success: false,
        message: "Invalid location",
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(suppliers)
        .set({
          name: validation.data.name,
          address: validation.data.address,
          villageId: validation.data.villageId,
          updatedBy: user.id,
        })
        .where(eq(suppliers.id, id))

      const existingAccounts = await tx.query.supplierAccounts.findMany({
        columns: {
          id: true,
        },
        where: eq(supplierAccounts.supplierId, id),
      })

      const existingIds = new Set(existingAccounts.map((account) => account.id))
      const submittedIds = new Set(
        validation.data.accounts
          .map((account) => account.id)
          .filter((accountId): accountId is string => Boolean(accountId))
      )
      const removedIds = existingAccounts
        .map((account) => account.id)
        .filter((accountId) => !submittedIds.has(accountId))
      const existingSubmittedAccounts = validation.data.accounts.filter(
        (account): account is typeof account & { id: string } => {
          if (!account.id) {
            return false
          }

          return existingIds.has(account.id)
        }
      )
      const newAccounts = validation.data.accounts.filter(
        (account) => !account.id
      )

      await Promise.all(
        existingSubmittedAccounts.map((account) =>
          tx
            .update(supplierAccounts)
            .set({
              bankId: account.bankId,
              accountNo: account.accountNo,
              accountName: account.accountName,
              updatedBy: user.id,
            })
            .where(
              and(
                eq(supplierAccounts.id, account.id!),
                eq(supplierAccounts.supplierId, id)
              )
            )
        )
      )

      if (newAccounts.length) {
        await tx.insert(supplierAccounts).values(
          newAccounts.map((account) => ({
            supplierId: id,
            bankId: account.bankId,
            accountNo: account.accountNo,
            accountName: account.accountName,
            createdBy: user.id,
          }))
        )
      }

      await Promise.all(
        removedIds.map((accountId) =>
          tx
            .delete(supplierAccounts)
            .where(
              and(
                eq(supplierAccounts.id, accountId),
                eq(supplierAccounts.supplierId, id)
              )
            )
        )
      )
    })

    revalidatePath("/asset/supplier")

    return {
      success: true,
      message: "Supplier updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
