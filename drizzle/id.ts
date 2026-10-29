import { customType } from "drizzle-orm/pg-core"

function toInteger(value: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) {
    throw new Error(`Invalid integer ID: ${value}`)
  }
  return id
}

export const serialId = customType<{
  data: string
  driverData: number
  notNull: true
  default: true
}>({
  dataType: () => "serial",
  fromDriver: String,
  toDriver: toInteger,
})

export const integerId = customType<{ data: string; driverData: number }>({
  dataType: () => "integer",
  fromDriver: String,
  toDriver: toInteger,
})
