import { Types } from "mongoose"

export interface ISessionAttendance {
    student: Types.ObjectId
    markedAt: Date
}

export interface ISession {
    teacher: Types.ObjectId
    center?: Types.ObjectId | null
    schedule?: Types.ObjectId | null
    sequence: string
    week: number
    number: number
    grade?: string | undefined
    price?: number | null | undefined
    active: boolean
    date?: Date | undefined
    status?: "normal" | "cancelled"
    closing?: {
        normalCost: number
        reducedCost: number
        reducedCount: number
        notes?: string | undefined
    } | null
    attendance: ISessionAttendance[]
    createdAt?: Date
    updatedAt?: Date
}
