"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  purchaseOrders,
  poDetails,
  purchaseRequests,
  prDetails,
  suppliers,
  roleUser,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  purchaseOrderSchema,
  purchaseOrderSchemaType,
} from "@/lib/formSchemas/purchase-order-schema"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function isSuperAdmin(userId: string) {
  const userRoles = await db.query.roleUser.findMany({
    where: and(eq(roleUser.userId, userId), eq(roleUser.isActive, true)),
    with: {
      role: true,
    },
  })

  return userRoles.some((ur) => ur.role.name === "Super Administrator")
}

async function validatePurchaseOrderPayload(
  values: purchaseOrderSchemaType,
  userId: string,
  excludePoId?: string
) {
  // 1. Verify PR status
  const pr = await db.query.purchaseRequests.findFirst({
    where: eq(purchaseRequests.id, values.prId),
    columns: { id: true, status: true, createdBy: true },
  })

  if (!pr) {
    return { success: false, message: "Purchase request not found" }
  }

  if (pr.status !== "APPROVED") {
    return {
      success: false,
      message: "Selected purchase request status must be APPROVED",
    }
  }

  // Ownership check for non-superadmin
  const superAdmin = await isSuperAdmin(userId)
  if (!superAdmin && pr.createdBy !== userId) {
    return { success: false, message: "You do not own the selected purchase request" }
  }

  // 2. Verify Supplier exists
  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, values.supplierId),
    columns: { id: true },
  })

  if (!supplier) {
    return { success: false, message: "Supplier not found" }
  }

  // 3. Verify detail uniqueness
  const prDtlIds = values.details.map((d) => d.prDtlId)
  if (new Set(prDtlIds).size !== prDtlIds.length) {
    return { success: false, message: "Duplicate purchase request lines are not allowed" }
  }

  // 4. Verify detail lines belong to the selected PR
  const actualPrDetails = await db.query.prDetails.findMany({
    where: inArray(prDetails.id, prDtlIds),
    columns: { id: true, prId: true, quantity: true },
  })

  const actualPrDetailsMap = new Map(actualPrDetails.map((d) => [d.id, d]))

  for (const detail of values.details) {
    const prDtl = actualPrDetailsMap.get(detail.prDtlId)
    if (!prDtl || prDtl.prId !== values.prId) {
      return { success: false, message: "Selected item does not belong to the purchase request" }
    }
  }

  // 5. Verify quantity remaining limits
  // Get all existing PO details for these PR detail lines
  const existingPoDetails = await db.query.poDetails.findMany({
    where: inArray(poDetails.prDtlId, prDtlIds),
    columns: { id: true, poId: true, prDtlId: true, quantity: true },
    with: {
      purchaseOrder: {
        columns: { id: true, status: true },
      },
    },
  })

  // Group existing quantity by prDtlId (filter out excluded PO)
  const orderedQtyMap = new Map<string, number>()
  for (const pod of existingPoDetails) {
    if (excludePoId && pod.poId === excludePoId) {
      continue
    }
    const currentQty = orderedQtyMap.get(pod.prDtlId) ?? 0
    orderedQtyMap.set(pod.prDtlId, currentQty + (pod.quantity ?? 0))
  }

  for (const detail of values.details) {
    const prDtl = actualPrDetailsMap.get(detail.prDtlId)!
    const requestedQuantity = prDtl.quantity ?? 0
    const alreadyOrdered = orderedQtyMap.get(detail.prDtlId) ?? 0
    const totalNewQuantity = alreadyOrdered + detail.quantity

    if (totalNewQuantity > requestedQuantity) {
      return {
        success: false,
        message: `Ordered quantity exceeds purchase request quantity limit. Requested: ${requestedQuantity}, Already ordered: ${alreadyOrdered}, Input: ${detail.quantity}`,
      }
    }
  }

  return { success: true }
}

export async function purchaseOrderStore(values: purchaseOrderSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("purchase-order:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = purchaseOrderSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    const payloadValidation = await validatePurchaseOrderPayload(validation.data, user.id)

    if (!payloadValidation.success) {
      return payloadValidation
    }

    await db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          date: validation.data.date,
          prId: validation.data.prId,
          supplierId: validation.data.supplierId,
          description: validation.data.description,
          shippingCost: validation.data.shippingCost,
          status: "REQUEST",
          createdBy: user.id,
        })
        .returning()

      for (const d of validation.data.details) {
        await tx.insert(poDetails).values({
          poId: po.id,
          prDtlId: d.prDtlId,
          quantity: d.quantity,
          price: d.price,
          total: d.quantity * d.price,
          createdBy: user.id,
        })
      }
    })

    revalidatePath("/asset/purchase-order")

    return {
      success: true,
      message: "Purchase order created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function purchaseOrderUpdate(id: string, values: purchaseOrderSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("purchase-order:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = purchaseOrderSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    // Verify PO status and owner
    const existing = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, id),
      columns: { id: true, prId: true, status: true, createdBy: true },
    })

    if (!existing) {
      return {
        success: false,
        message: "Purchase order not found",
      }
    }

    if (existing.status !== "REQUEST") {
      return {
        success: false,
        message: "Only purchase orders with status 'REQUEST' can be updated.",
      }
    }

    const superAdmin = await isSuperAdmin(user.id)
    if (!superAdmin && existing.createdBy !== user.id) {
      return {
        success: false,
        message: "You do not own this purchase order",
      }
    }

    if (validation.data.prId !== existing.prId) {
      return {
        success: false,
        message: "Purchase request cannot be changed",
      }
    }

    const payloadValidation = await validatePurchaseOrderPayload(validation.data, user.id, id)

    if (!payloadValidation.success) {
      return payloadValidation
    }

    await db.transaction(async (tx) => {
      await tx
        .update(purchaseOrders)
        .set({
          date: validation.data.date,
          supplierId: validation.data.supplierId,
          description: validation.data.description,
          shippingCost: validation.data.shippingCost,
          updatedBy: user.id,
        })
        .where(eq(purchaseOrders.id, id))

      await tx.delete(poDetails).where(eq(poDetails.poId, id))

      for (const d of validation.data.details) {
        await tx.insert(poDetails).values({
          poId: id,
          prDtlId: d.prDtlId,
          quantity: d.quantity,
          price: d.price,
          total: d.quantity * d.price,
          createdBy: user.id,
        })
      }
    })

    revalidatePath("/asset/purchase-order")

    return {
      success: true,
      message: "Purchase order updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
