import z from "zod"

export const integerIdSchema = z.number().int().positive().max(2_147_483_647)

export const integerIdStringSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .refine((value) => Number(value) <= 2_147_483_647)

export const coercedIntegerIdSchema = z.coerce.number().pipe(integerIdSchema)

export function parseIntegerId(value: unknown) {
  const result = coercedIntegerIdSchema.safeParse(value)
  return result.success ? result.data : null
}
