"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { purchaseRequests } from "@/drizzle/schemas/asset-transaction"
import { authorizeAction } from "@/lib/auth/permission"
import { purchaseRequestRejectSchema } from "@/lib/formSchemas/purchase-request-schema"
import { eq } from "drizzle-orm"

type PurchaseRequestDecisionStatus = "APPROVED" | "REJECTED"

async function updatePurchaseRequestStatus(
  id: string,
  status: PurchaseRequestDecisionStatus,
  reason?: string
) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("purchase-request:update")

    if (!permission.authorized) {
      return permission.response
    }

    const existing = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, id),
      columns: { id: true, status: true },
    })

    if (!existing) {
      return {
        success: false,
        message: "Purchase request not found",
      }
    }

    if (existing.status !== "REQUEST") {
      return {
        success: false,
        message:
          "Only purchase requests with status 'REQUEST' can be approved or rejected.",
      }
    }

    let rejectedReason: string | null = null

    if (status === "REJECTED") {
      const validation = purchaseRequestRejectSchema.safeParse({
        reason: reason ?? "",
      })

      if (!validation.success) {
        return {
          success: false,
          message:
            validation.error.issues[0]?.message ?? "Reason is required",
        }
      }

      rejectedReason = validation.data.reason
    }

    await db
      .update(purchaseRequests)
      .set({
        status,
        reason: rejectedReason,
        updatedBy: user.id,
      })
      .where(eq(purchaseRequests.id, id))

    return {
      success: true,
      message:
        status === "APPROVED"
          ? "Purchase request approved successfully"
          : "Purchase request rejected successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function purchaseRequestApprove(id: string) {
  return updatePurchaseRequestStatus(id, "APPROVED")
}

export async function purchaseRequestReject(id: string, reason: string) {
  return updatePurchaseRequestStatus(id, "REJECTED", reason)
}
