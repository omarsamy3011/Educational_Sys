import { z } from "zod"

export const createSessionSchema = z.object({
    sequence: z.string().trim().min(1).max(160),
    week: z.number().int().min(1).max(60),
    number: z.number().int().min(1).max(999)
})

export const setSessionActiveSchema = z.object({
    active: z.boolean()
})

export const markAttendanceSchema = z.object({
    identifier: z.string().trim().min(1).max(80)
})
