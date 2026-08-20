"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  purchaseOrders,
  poDetails,
  purchaseRequests,
  prDetails,
  suppliers,
  companies,
  supplierAccounts,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import {
  purchaseOrderSchema,
  purchaseOrderSchemaType,
} from "@/lib/formSchemas/purchase-order-schema"
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function getPurchaseOrderPeriod(date: string | Date) {
  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    return {
      year,
      yearText: String(year).slice(-2),
      month,
      monthText: String(month).padStart(2, "0"),
    }
  }

  const [yearText, monthText] = date.split("-")
  const year = Number(yearText)
  const month = Number(monthText)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    yearText.length !== 4 ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("Invalid purchase order date")
  }

  return {
    year,
    yearText: yearText.slice(-2),
    month,
    monthText: String(month).padStart(2, "0"),
  }
}

async function generatePurchaseOrderNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    prId: string
    date: string | Date
  }
) {
  const [pr] = await tx
    .select({ companyCode: companies.code })
    .from(purchaseRequests)
    .innerJoin(companies, eq(companies.id, purchaseRequests.companyId))
    .where(eq(purchaseRequests.id, input.prId))

  if (!pr?.companyCode?.trim()) {
    throw new Error("Purchase request company not found")
  }

  const { yearText, monthText } = getPurchaseOrderPeriod(input.date)
  const prefix = `PO/${pr.companyCode.trim()}/${yearText}/${monthText}/`

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)

  const [last] = await tx
    .select({
      poNo: purchaseOrders.poNo,
    })
    .from(purchaseOrders)
    .where(ilike(purchaseOrders.poNo, `${prefix}%`))
    .orderBy(desc(purchaseOrders.createdAt))

   const sequence = String((last?.poNo ? parseInt(last.poNo.split("/").pop() || "0") : 0) + 1).padStart(3, "0")

  return `${prefix}${sequence}`
}

async function validatePurchaseOrderPayload(
  values: purchaseOrderSchemaType,
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

  // 2. Verify Supplier exists
  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, values.supplierId),
    columns: { id: true },
  })

  if (!supplier) {
    return { success: false, message: "Supplier not found" }
  }

  // 2b. Verify Supplier Account (if provided)
  if (values.supplierAccountId && values.supplierAccountId !== "") {
    const account = await db.query.supplierAccounts.findFirst({
      where: and(
        eq(supplierAccounts.id, values.supplierAccountId),
        eq(supplierAccounts.supplierId, values.supplierId)
      ),
      columns: { id: true },
    })

    if (!account) {
      return {
        success: false,
        message: "Supplier account not found or does not belong to selected supplier",
      }
    }
  }

  // 3. Verify detail uniqueness
  const prDtlIds = values.details.map((d) => d.prDtlId)
  if (new Set(prDtlIds).size !== prDtlIds.length) {
    return {
      success: false,
      message: "Duplicate purchase request lines are not allowed",
    }
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
      return {
        success: false,
        message: "Selected item does not belong to the purchase request",
      }
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

    const payloadValidation = await validatePurchaseOrderPayload(
      validation.data
    )

    if (!payloadValidation.success) {
      return payloadValidation
    }

    await db.transaction(async (tx) => {
      const poNo = await generatePurchaseOrderNumber(tx, {
        prId: validation.data.prId,
        date: validation.data.date,
      })

      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          date: validation.data.date,
          poNo,
          prId: validation.data.prId,
          supplierId: validation.data.supplierId,
          supplierAccountId:
            validation.data.supplierAccountId || null,
          description: validation.data.description,
          shippingCost: validation.data.shippingCost,
          createdBy: user.id,
        })
        .returning()

      await tx
        .update(purchaseOrders)
        .set({
          totalQuantity: validation.data.details.reduce(
            (sum, d) => sum + d.quantity,
            0
          ),
          totalAmount: validation.data.details.reduce(
            (sum, d) => sum + d.quantity * d.price,
            0
          ),
          totalCost:
            validation.data.details.reduce(
              (sum, d) => sum + d.quantity * d.price,
              0
            ) + (validation.data.shippingCost ?? 0),
        })
        .where(eq(purchaseOrders.id, po.id))

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

    return {
      success: true,
      message: "Purchase order created successfully",
    }
  } catch (error) {
    console.log(error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function purchaseOrderUpdate(
  id: string,
  values: purchaseOrderSchemaType
) {
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

    if (existing.status !== "NEW") {
      return {
        success: false,
        message: "Only purchase orders with status 'NEW' can be updated.",
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

    const payloadValidation = await validatePurchaseOrderPayload(
      validation.data,
      id
    )

    if (!payloadValidation.success) {
      return payloadValidation
    }

    // Prevent editing PO if any detail has been received
    const existingPoDetails = await db.query.poDetails.findMany({
      where: eq(poDetails.poId, id),
      columns: { id: true },
      with: {
        receivedAssets: {
          columns: { id: true },
          limit: 1,
        },
      },
    })

    const hasReceived = existingPoDetails.some(
      (d) => d.receivedAssets && d.receivedAssets.length > 0
    )
    if (hasReceived) {
      return {
        success: false,
        message: "Cannot edit purchase order after assets have been received.",
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(purchaseOrders)
        .set({
          date: validation.data.date,
          supplierId: validation.data.supplierId,
          supplierAccountId:
            validation.data.supplierAccountId || null,
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

    revalidatePath("/asset-transaction/purchase-order")

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
