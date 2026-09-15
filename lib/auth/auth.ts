import { db } from "@/drizzle/db"
import * as schema from "@/drizzle/schema"
import { betterAuth, type BetterAuthOptions } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { customSession, phoneNumber, username } from "better-auth/plugins"
import { sendWa } from "../fonnte"
import { createAuthMiddleware } from "better-auth/api"
import { and, eq, ne } from "drizzle-orm"
import { getUserPermissionNames } from "./permission-query"

const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  user: {
    additionalFields: {
      changePassword: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
      companyId: {
        type: "string",
        required: false,
        input: false,
      },
      companyName: {
        type: "string",
        required: false,
        input: false,
      },
      branchId: {
        type: "string",
        required: false,
        input: false,
      },
      branchName: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/username") return

      const newSession = ctx.context.newSession

      if (!newSession) return

      const permissionNames = await getUserPermissionNames(newSession.user.id)

      await db.transaction(async (tx) => {
        await tx
          .update(schema.sessions)
          .set({
            permissions: permissionNames,
          })
          .where(eq(schema.sessions.id, newSession.session.id))

        await tx
          .delete(schema.sessions)
          .where(
            and(
              eq(schema.sessions.userId, newSession.user.id),
              ne(schema.sessions.id, newSession.session.id)
            )
          )
      })
    }),
  },
  plugins: [
    username(),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        await sendWa(phoneNumber, code)
      },
      sendPasswordResetOTP: async ({ phoneNumber, code }) => {
        await sendWa(phoneNumber, code)
      },
    }),
  ],
} satisfies BetterAuthOptions

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...authOptions.plugins,
    customSession(async ({ user, session }) => {
      const userRoles = await db.query.roleUser.findFirst({
        where: and(
          eq(schema.roleUser.userId, user.id),
          eq(schema.roleUser.isActive, true)
        ),
        with: {
          role: true,
        },
      })

      return {
        user: {
          ...user,
          role: userRoles?.role.name || null,
        },
        session,
      }
    }, authOptions),
    nextCookies(),
  ],
})
