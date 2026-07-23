"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  assetBrands,
  assetSpecs,
  banks,
  companies,
  prDetails,
  prSpecifications,
  purchaseRequests,
  suppliers,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  purchaseRequestSchema,
  purchaseRequestSchemaType,
} from "@/lib/formSchemas/purchase-request-schema"
import { and, desc, eq, ilike, inArray, isNotNull, ne, sql } from "drizzle-orm"

function isSafeIdentifier(value: string) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)
}

function getPurchaseRequestPeriod(date: string | Date) {
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
    throw new Error("Invalid purchase request date")
  }

  return {
    year,
    yearText: yearText.slice(-2),
    month,
    monthText: String(month).padStart(2, "0"),
  }
}

async function generatePurchaseRequestNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    companyId: string
    date: string | Date
  }
) {
  const [company] = await tx
    .select({ code: companies.code })
    .from(companies)
    .where(eq(companies.id, input.companyId))
    .for("update")

  if (!company?.code?.trim()) {
    throw new Error("Company not found")
  }

  const { yearText, monthText } = getPurchaseRequestPeriod(input.date)
  const prefix = `PR/${company.code.trim()}/${yearText}/${monthText}/`

  const [last] = await tx
    .select({
      prNo: purchaseRequests.prNo,
    })
    .from(purchaseRequests)
    .where(
      ilike(purchaseRequests.prNo, `${prefix}%`),
    )
    .orderBy(desc(purchaseRequests.createdAt))

  const sequence = String((last?.prNo ? parseInt(last.prNo.split("/").pop() || "0") : 0) + 1).padStart(3, "0")

  return `${prefix}${sequence}`
}

async function getAllowedSelectValues(spec: {
  id: string
  dataTable: string | null
}) {
  const savedValues = await db
    .selectDistinct({ value: prSpecifications.specValue })
    .from(prSpecifications)
    .where(
      and(
        eq(prSpecifications.specId, spec.id),
        isNotNull(prSpecifications.specValue),
        ne(prSpecifications.specValue, "")
      )
    )
  const values = new Set(
    savedValues
      .map((option) => option.value)
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase())
  )

  if (spec.dataTable && isSafeIdentifier(spec.dataTable)) {
    try {
      const result = await db.execute(
        sql.raw(
          `select distinct "name" from "public"."${spec.dataTable}" where "name" is not null and "name" <> ''`
        )
      )
      const rows = (result as unknown as { rows?: { name: string }[] }).rows ?? []

      for (const row of rows) {
        values.add(row.name.toLowerCase())
      }
    } catch {
      // Invalid data_table values should not break validation for createable specs.
    }
  }

  return values
}

async function insertCreateableSpecValues(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  values: { dataTable: string; value: string }[],
  userId: string
) {
  for (const value of values) {
    if (value.dataTable === "asset_brands") {
      const existing = await tx.query.assetBrands.findFirst({
        where: sql`lower(name) = ${value.value.toLowerCase()}`,
      })

      if (!existing) {
        await tx.insert(assetBrands).values({
          name: value.value,
          createdBy: userId,
        })
      }
    } else if (value.dataTable === "banks") {
      const existing = await tx.query.banks.findFirst({
        where: sql`lower(name) = ${value.value.toLowerCase()}`,
      })

      if (!existing) {
        await tx.insert(banks).values({
          name: value.value,
          createdBy: userId,
        })
      }
    } else if (value.dataTable === "suppliers") {
      const existing = await tx.query.suppliers.findFirst({
        where: sql`lower(name) = ${value.value.toLowerCase()}`,
      })

      if (!existing) {
        await tx.insert(suppliers).values({
          name: value.value,
          createdBy: userId,
        })
      }
    }
  }
}

async function validateDetailSpecifications(
  details: purchaseRequestSchemaType["details"]
) {
  const assetCodeIds = [...new Set(details.map((detail) => detail.assetCodeId))]

  if (!assetCodeIds.length) {
    return { success: true, newSpecValuesToInsert: [] }
  }

  const specs = await db.query.assetSpecs.findMany({
    where: inArray(assetSpecs.codeId, assetCodeIds),
    columns: {
      id: true,
      codeId: true,
      type: true,
      dataTable: true,
      isRequired: true,
      createable: true,
    },
  })
  const specMap = new Map(specs.map((spec) => [spec.id, spec]))

  const newSpecValuesToInsert: { dataTable: string; value: string }[] = []

  for (const detail of details) {
    const detailSpecIds = detail.specifications.map((spec) => spec.specId)
    const uniqueSpecIds = new Set(detailSpecIds)

    if (uniqueSpecIds.size !== detailSpecIds.length) {
      return {
        success: false,
        message: "Duplicate specifications are not allowed in the same item",
        newSpecValuesToInsert: [],
      }
    }

    const requiredSpecs = specs.filter(
      (spec) => spec.codeId === detail.assetCodeId && spec.isRequired
    )

    for (const requiredSpec of requiredSpecs) {
      if (!uniqueSpecIds.has(requiredSpec.id)) {
        return {
          success: false,
          message: "Required specification is missing",
          newSpecValuesToInsert: [],
        }
      }
    }

    for (const spec of detail.specifications) {
      const specMeta = specMap.get(spec.specId)

      if (!specMeta || specMeta.codeId !== detail.assetCodeId) {
        return {
          success: false,
          message: "Specification does not match selected asset code",
          newSpecValuesToInsert: [],
        }
      }

      const specValue = spec.specValue.trim()

      if (specMeta.isRequired && !specValue) {
        return {
          success: false,
          message: "Required specification value is missing",
          newSpecValuesToInsert: [],
        }
      }

      if (specMeta.type === "SELECT" && specValue) {
        const allowedValues = await getAllowedSelectValues(specMeta)

        if (!allowedValues.has(specValue.toLowerCase())) {
          if (!specMeta.createable) {
            return {
              success: false,
              message: "Specification value is not allowed",
              newSpecValuesToInsert: [],
            }
          }

          if (specMeta.dataTable) {
            newSpecValuesToInsert.push({
              dataTable: specMeta.dataTable,
              value: specValue,
            })
            allowedValues.add(specValue.toLowerCase())
          }
        }
      }
    }
  }

  return { success: true, newSpecValuesToInsert }
}

export async function purchaseRequestStore(values: purchaseRequestSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("purchase-request:create")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = purchaseRequestSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    const { details, ...header } = validation.data

    const specificationValidation = await validateDetailSpecifications(details)

    if (!specificationValidation.success) {
      return specificationValidation
    }

    const totalQuantity = details.reduce((sum, d) => sum + d.quantity, 0)
    const totalAmount = details.reduce(
      (sum, d) => sum + d.price * d.quantity,
      0
    )

    await db.transaction(async (tx) => {
      await insertCreateableSpecValues(
        tx,
        specificationValidation.newSpecValuesToInsert,
        user.id
      )

      const prNo = await generatePurchaseRequestNumber(tx, {
        companyId: header.companyId,
        date: header.date,
      })

      const [pr] = await tx
        .insert(purchaseRequests)
        .values({
          date: header.date,
          prNo,
          companyId: header.companyId,
          assetCategoryId: header.assetCategoryId,
          description: header.description || null,
          totalQuantity,
          totalAmount,
          status: "REQUEST",
          createdBy: user.id,
        })
        .returning()

      for (let i = 0; i < details.length; i++) {
        const detail = details[i]
        const detailTotal = detail.price * detail.quantity

        const [dtl] = await tx
          .insert(prDetails)
          .values({
            prId: pr.id,
            assetCodeId: detail.assetCodeId,
            price: detail.price,
            quantity: detail.quantity,
            total: detailTotal,
            createdBy: user.id,
          })
          .returning()

        if (detail.specifications.length) {
          await tx.insert(prSpecifications).values(
            detail.specifications.map((spec) => ({
              prDtlId: dtl.id,
              specId: spec.specId,
              specValue: spec.specValue.trim() || null,
              createdBy: user.id,
            }))
          )
        }
      }
    })

    return {
      success: true,
      message: "Purchase request created successfully",
    }
  } catch (error) {
    console.log(error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function purchaseRequestUpdate(
  id: string,
  values: purchaseRequestSchemaType
) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("purchase-request:update")

    if (!permission.authorized) {
      return permission.response
    }

    const validation = purchaseRequestSchema.safeParse(values)

    if (!validation.success) {
      return {
        success: false,
        message: "Invalid form data",
      }
    }

    // Check status before allowing update
    const existing = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, id),
      columns: { status: true },
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
          "Only purchase requests with status 'REQUEST' can be updated.",
      }
    }

    const { details, ...header } = validation.data

    const specificationValidation = await validateDetailSpecifications(details)

    if (!specificationValidation.success) {
      return specificationValidation
    }

    const totalQuantity = details.reduce((sum, d) => sum + d.quantity, 0)
    const totalAmount = details.reduce(
      (sum, d) => sum + d.price * d.quantity,
      0
    )

    await db.transaction(async (tx) => {
      await insertCreateableSpecValues(
        tx,
        specificationValidation.newSpecValuesToInsert,
        user.id
      )

      // Update header
      await tx
        .update(purchaseRequests)
        .set({
          date: header.date,
          companyId: header.companyId,
          assetCategoryId: header.assetCategoryId,
          description: header.description || null,
          totalQuantity,
          totalAmount,
          updatedBy: user.id,
        })
        .where(eq(purchaseRequests.id, id))

      // Get existing detail ids to delete specs
      const existingDetails = await tx.query.prDetails.findMany({
        columns: { id: true },
        where: eq(prDetails.prId, id),
      })

      const existingDetailIds = existingDetails.map((d) => d.id)

      // Delete old specs and details
      if (existingDetailIds.length) {
        await tx
          .delete(prSpecifications)
          .where(inArray(prSpecifications.prDtlId, existingDetailIds))
      }

      await tx.delete(prDetails).where(eq(prDetails.prId, id))

      // Reinsert details and specs
      for (let i = 0; i < details.length; i++) {
        const detail = details[i]
        const detailTotal = detail.price * detail.quantity

        const [dtl] = await tx
          .insert(prDetails)
          .values({
            prId: id,
            assetCodeId: detail.assetCodeId,
            price: detail.price,
            quantity: detail.quantity,
            total: detailTotal,
            createdBy: user.id,
          })
          .returning()

        if (detail.specifications.length) {
          await tx.insert(prSpecifications).values(
            detail.specifications.map((spec) => ({
              prDtlId: dtl.id,
              specId: spec.specId,
              specValue: spec.specValue.trim() || null,
              createdBy: user.id,
            }))
          )
        }
      }
    })

    return {
      success: true,
      message: "Purchase request updated successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
