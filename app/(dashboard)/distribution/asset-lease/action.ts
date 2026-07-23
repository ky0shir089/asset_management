"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  assetDatas,
  branches,
  companies,
  customers,
  outlets,
  rentAssetDetails,
  rentAssets,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  assetLeaseSchema,
  type assetLeaseSchemaType,
} from "@/lib/formSchemas/asset-lease-schema"
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function generateRentNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  createdAt = new Date()
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(createdAt)
      .filter((part) => part.type === "year" || part.type === "month")
      .map((part) => [part.type, part.value])
  )
  const prefix = `SWA/${parts.year}/${parts.month}/`

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)

  const [last] = await tx
    .select({ rentNo: rentAssets.rentNo })
    .from(rentAssets)
    .where(ilike(rentAssets.rentNo, `${prefix}%`))
    .orderBy(desc(rentAssets.rentNo))
    .limit(1)

  const lastSequence = Number(last?.rentNo.split("/").pop() ?? 0)

  if (lastSequence >= 99_999) {
    throw new Error("Monthly asset lease number capacity reached")
  }

  const sequence = String(lastSequence + 1).padStart(5, "0")

  return `${prefix}${sequence}`
}

export async function assetLeaseStore(values: assetLeaseSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("asset-lease:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = assetLeaseSchema.safeParse(values)

    if (!validation.success) {
      return { success: false, message: "Invalid form data" }
    }

    const data = validation.data

    await db.transaction(async (tx) => {
      const [outlet] = await tx
        .select({ id: outlets.id })
        .from(outlets)
        .where(and(eq(outlets.id, data.outletId), eq(outlets.isActive, true)))
        .limit(1)

      if (!outlet) {
        throw new Error("Outlet not found or inactive")
      }

      const customerIds = [
        ...new Set(data.details.map((detail) => detail.customerId)),
      ]
      const selectedCustomers = await tx
        .select({ id: customers.id, outletId: customers.outletId })
        .from(customers)
        .where(inArray(customers.id, customerIds))

      if (
        selectedCustomers.length !== customerIds.length ||
        selectedCustomers.some(
          (customer) => customer.outletId !== data.outletId
        )
      ) {
        throw new Error("Every customer must belong to selected outlet")
      }

      const assetIds = [
        ...new Set(data.details.map((detail) => detail.assetId)),
      ]
      const lsaOutletIds = tx
        .select({ id: outlets.id })
        .from(outlets)
        .innerJoin(branches, eq(outlets.branchId, branches.id))
        .innerJoin(companies, eq(branches.companyId, companies.id))
        .where(eq(companies.code, "LSA"))

      const claimedAssets = await tx
        .update(assetDatas)
        .set({ status: "DISEWA", updatedBy: user.id })
        .where(
          and(
            inArray(assetDatas.id, assetIds),
            eq(assetDatas.status, "TERSEDIA"),
            inArray(assetDatas.outletId, lsaOutletIds)
          )
        )
        .returning({ id: assetDatas.id })

      if (claimedAssets.length !== assetIds.length) {
        throw new Error("One or more selected assets are no longer available")
      }

      const rentNo = await generateRentNumber(tx)
      const [rentAsset] = await tx
        .insert(rentAssets)
        .values({
          rentNo,
          outletId: data.outletId,
          note: data.note?.trim() || null,
          status: "NEW",
          createdBy: user.id,
        })
        .returning({ id: rentAssets.id })

      await tx.insert(rentAssetDetails).values(
        data.details.map((detail, index) => ({
          rentAssetId: rentAsset.id,
          assetId: detail.assetId,
          customerId: detail.customerId,
          position: index,
          dateStart: detail.dateStart,
          dateEnd: detail.dateEnd || null,
          amount: detail.amount,
          createdBy: user.id,
        }))
      )
    })

    revalidatePath("/distribution/asset-lease")

    return { success: true, message: "Asset lease created successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
