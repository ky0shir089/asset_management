import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url(),
    MEKARI_API_BASE_URL: z.url(),
    MEKARI_API_CLIENT_ID: z.string(),
    MEKARI_API_CLIENT_SECRET: z.string(),
    FONNTE_TOKEN: z.string(),
  },
  client: {
    //
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    MEKARI_API_BASE_URL: process.env.MEKARI_API_BASE_URL,
    MEKARI_API_CLIENT_ID: process.env.MEKARI_API_CLIENT_ID,
    MEKARI_API_CLIENT_SECRET: process.env.MEKARI_API_CLIENT_SECRET,
    FONNTE_TOKEN: process.env.FONNTE_TOKEN,
  },
})
