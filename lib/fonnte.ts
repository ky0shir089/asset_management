"use server"

import { env } from "./env"

export async function sendWa(phoneNumber: string, code: string) {
  const data = new FormData()
  data.append("target", phoneNumber)
  data.append(
    "message",
    `Kode reset password Anda: ${code}. Berlaku 5 menit. Jangan berikan kode ini kepada siapa pun.`
  )

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: new Headers({
      Authorization: env.FONNTE_TOKEN,
    }),
    body: data,
  })

  if (!response.ok) {
    const res = await response.json()
    console.error("Fonnte API error:", res)
  }
}
