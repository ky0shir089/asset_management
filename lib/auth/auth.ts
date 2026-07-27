import { db } from "@/drizzle/db"
import * as schema from "@/drizzle/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { phoneNumber, username } from "better-auth/plugins"
import { sendWa } from "../fonnte"
import { createAuthMiddleware } from "better-auth/api"
import { and, eq, ne } from "drizzle-orm"
import { getUserPermissionNames } from "./permission-query"

export const auth = betterAuth({
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
    nextCookies(),
  ],
})
