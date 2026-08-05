"use server"

import { db } from "@/drizzle/db"
import { branches, outlets, roleUser, sessions, users } from "@/drizzle/schema"
import { auth } from "@/lib/auth/auth"
import { env } from "@/lib/env"
import {
  signInSchema,
  type signInSchemaType,
} from "@/lib/formSchemas/auth-schema"
import { eq } from "drizzle-orm"
import { createHmac } from "node:crypto"
import { headers } from "next/headers"

type SignInUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.signInUsername>>
>["user"]
type SignUpUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.signUpEmail>>
>["user"]

type AuthenticatedUser = (SignInUser | SignUpUser) & {
  changePassword: boolean
}

type LoginActionResult =
  | {
      success: true
      message: string
      data: AuthenticatedUser
    }
  | {
      success: false
      message: string
      data?: undefined
    }

function getClientIp(requestHeaders: Awaited<ReturnType<typeof headers>>) {
  const forwardedFor = requestHeaders.get("x-forwarded-for")
  const forwardedIp = forwardedFor?.split(",").at(0)?.trim()

  return (
    forwardedIp ||
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("true-client-ip") ||
    requestHeaders.get("x-client-ip")
  )
}

function generate_headers(method: string, pathWithQueryParam: string) {
  const clientId = env.MEKARI_API_CLIENT_ID
  const clientSecret = env.MEKARI_API_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Mekari API credentials are not configured")
  }

  const datetime = new Date().toUTCString()
  const requestLine = `${method} ${pathWithQueryParam} HTTP/1.1`
  const payload = [`date: ${datetime}`, requestLine].join("\n")
  const signature = createHmac("sha256", clientSecret)
    .update(payload)
    .digest("base64")

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Date: datetime,
    Authorization: `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`,
  }
}

export async function fetchTalentaIdByEmployeeId(employeeId: string) {
  try {
    const method = "GET"
    const path = "/v2/talenta/v3/employee/employment-info"
    const queryParam = `?employee_id=${employeeId}`
    const headers = {
      "X-Idempotency-Key": "1234",
    }

    const options = {
      method: method,
      headers: { ...generate_headers(method, path + queryParam), ...headers },
    }

    const response = await fetch(
      `${env.MEKARI_API_BASE_URL}${path}${queryParam}`,
      options
    )
    const payload = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: payload.message ?? "Failed to fetch Talenta employment info",
      }
    }

    return {
      success: true,
      data: payload.data,
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch Talenta employment info",
    }
  }
}

export async function fetchTalentaEmployee(employeeId: number) {
  try {
    const method = "GET"
    const path = "/v2/talenta/v2/employee/"
    const queryParam = `${employeeId}`
    const headers = {
      "X-Idempotency-Key": "1234",
    }

    const options = {
      method: method,
      headers: { ...generate_headers(method, path + queryParam), ...headers },
    }

    const response = await fetch(
      `${env.MEKARI_API_BASE_URL}${path}${queryParam}`,
      options
    )
    const payload = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: payload.message ?? "Failed to fetch Talenta employee info",
      }
    }

    return {
      success: true,
      data: payload.data,
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch Talenta employee info",
    }
  }
}

export async function fetchTalentaBranch(branchId: string) {
  try {
    const method = "GET"
    const path = `/v2/talenta/v3/company/branch/${branchId}`
    const headers = {
      "X-Idempotency-Key": "1234",
    }

    const options = {
      method: method,
      headers: { ...generate_headers(method, path), ...headers },
    }

    const response = await fetch(`${env.MEKARI_API_BASE_URL}${path}`, options)
    const payload = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: payload.message ?? "Failed to fetch Talenta branch info",
      }
    }

    return {
      success: true,
      data: payload.data,
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch Talenta branch info",
    }
  }
}

export async function talentaService(username: string) {
  const employeeRes = await fetchTalentaIdByEmployeeId(username)

  if (!employeeRes.success) {
    return employeeRes
  }

  const employmentId = employeeRes.data?.employment?.id
  const employmentRes = await fetchTalentaEmployee(employmentId)

  if (!employmentRes.success) {
    return employmentRes
  }

  return {
    success: true,
    data: employmentRes.data.employee,
  }
}

export async function networkService(branchId: string, userId: string) {
  const branchRes = await fetchTalentaBranch(branchId)

  if (!branchRes.success) {
    return branchRes
  }

  const parentBranchId = branchRes.data.parent_branch_id
  const branchName =
    parentBranchId == 0
      ? branchRes.data.name
      : branchRes.data.name.split(" - ")[1]

  const [data] = await db
    .insert(branches)
    .values({
      companyId: parentBranchId == 0 ? branchId : parentBranchId,
      branchId,
      name: branchName,
      createdBy: userId,
    })
    .onConflictDoUpdate({
      target: [branches.branchId],
      set: {
        name: branchName,
        updatedBy: userId,
      },
    })
    .returning({ id: branches.branchId })

  return {
    success: true,
    data: data,
  }
}

export async function signUp(username: string): Promise<LoginActionResult> {
  try {
    const result = await talentaService(username)

    if (!result.success) {
      return {
        success: false,
        message: result.message,
      }
    }

    const employee = result.data

    if (employee.employment.status === "Resigned") {
      return {
        success: false,
        message: "Employee has resigned",
      }
    }

    const data = await auth.api.signUpEmail({
      body: {
        email: employee.personal.email,
        name: `${employee.personal.first_name} ${employee.personal.last_name}`,
        password: "12345678",
        image: employee.personal.avatar,
        username,
        displayUsername: employee.personal.first_name,
        phoneNumber: employee.personal.mobile_phone,
      },
    })

    const requestHeaders = await headers()

    await db.transaction(async (tx) => {
      await tx.insert(roleUser).values({
        userId: data.user.id,
        roleId: "3b65806f-f6b9-489e-89fb-d3ea99186f30",
        createdBy: data.user.id,
      })

      await tx
        .update(sessions)
        .set({
          ipAddress: getClientIp(requestHeaders),
          userAgent: requestHeaders.get("user-agent"),
        })
        .where(eq(sessions.userId, data.user.id))

      await tx
        .update(users)
        .set({
          companyId: employee.employment.branch_id,
          companyName: employee.employment.branch,
          branchId: employee.employment.organization_id,
          branchName: employee.employment.organization_name,
        })
        .where(eq(users.id, data.user.id))

      const branch = await networkService(
        employee.employment.branch_id,
        data.user.id
      )

      await tx
        .insert(outlets)
        .values({
          branchId: branch.data.id,
          outletId: employee.employment.organization_id,
          name: employee.employment.organization_name,
          createdBy: data.user.id,
        })
        .onConflictDoUpdate({
          target: [outlets.outletId],
          set: {
            name: employee.employment.organization_name,
            updatedBy: data.user.id,
          },
        })
    })

    return {
      success: true,
      message: "Sign up successful",
      data: {
        ...data.user,
        changePassword: data.user.changePassword,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sign up",
    }
  }
}

export async function signIn(
  values: signInSchemaType
): Promise<LoginActionResult> {
  const { username, password } = signInSchema.parse(values)

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    })

    if (!user) {
      return await signUp(username)
    }

    const data = await auth.api.signInUsername({
      body: {
        username,
        password,
      },
    })

    if (!data) {
      return {
        success: false,
        message: "Invalid Employee ID or password",
      }
    }

    const result = await talentaService(username)

    if (!result.success) {
      await db.delete(sessions).where(eq(sessions.token, data.token))
      return {
        success: false,
        message: result.message,
      }
    }

    const employee = result.data

    if (employee.employment.status === "Resigned") {
      await db.delete(sessions).where(eq(sessions.token, data.token))
      return {
        success: false,
        message: "Employee has resigned",
      }
    }

    const requestHeaders = await headers()

    await db.transaction(async (tx) => {
      await tx
        .update(sessions)
        .set({
          ipAddress: getClientIp(requestHeaders),
          userAgent: requestHeaders.get("user-agent"),
        })
        .where(eq(sessions.token, data.token))

      await tx
        .update(users)
        .set({
          companyId: employee.employment.branch_id,
          companyName: employee.employment.branch,
          branchId: employee.employment.organization_id,
          branchName: employee.employment.organization_name,
        })
        .where(eq(users.id, data.user.id))

      const branch = await networkService(
        employee.employment.branch_id,
        data.user.id
      )

      await tx
        .insert(outlets)
        .values({
          branchId: branch.data.id,
          outletId: employee.employment.organization_id,
          name: employee.employment.organization_name,
          createdBy: data.user.id,
        })
        .onConflictDoUpdate({
          target: [outlets.outletId],
          set: {
            name: employee.employment.organization_name,
            updatedBy: data.user.id,
          },
        })
    })

    return {
      success: true,
      message: "Login successful",
      data: {
        ...data.user,
        changePassword: user.changePassword ?? true,
      },
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Invalid Employee ID or password",
    }
  }
}
