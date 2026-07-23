"use server"

import { db } from "@/drizzle/db"
import { sessions, users } from "@/drizzle/schema"
import { auth } from "@/lib/auth/auth"
import { env } from "@/lib/env"
import { signInSchema, type signInSchemaType } from "@/lib/formSchemas/auth-schema"
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

    if (!data) {
      return {
        success: false,
        message: "Failed to sign up",
      }
    }

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

    const requestHeaders = await headers()

    await db
      .update(sessions)
      .set({
        ipAddress: getClientIp(requestHeaders),
        userAgent: requestHeaders.get("user-agent"),
      })
      .where(eq(sessions.token, data.token))

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
