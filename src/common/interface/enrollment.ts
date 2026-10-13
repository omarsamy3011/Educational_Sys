import { Types } from "mongoose";

export type EnrollmentStatus = "pending" | "active";

export interface EnrollmentPointEntry {
    points: number;
    reason: string;
    by: Types.ObjectId;
    createdAt: Date;
}

export interface EnrollmentTransactionEntry {
    _id?: Types.ObjectId;
    amount: number;
    type: string;
    reason: string;
    by: Types.ObjectId;
    createdAt: Date;
}

export interface EnrollmentWarningEntry {
    _id?: Types.ObjectId;
    reason: string;
    by: Types.ObjectId;
    createdAt: Date;
}

export interface IEnrollment {
    teacher: Types.ObjectId;
    student: Types.ObjectId;
    status: EnrollmentStatus;
    archived?: boolean;
    archivedAt?: Date | null;
    removedReason?: string;
    balance?: number;
    points: number;
    pointsHistory?: EnrollmentPointEntry[];
    transactionHistory?: EnrollmentTransactionEntry[];
    warnings?: EnrollmentWarningEntry[];
    isBlocked?: boolean;
    pricePerSession?: number;
    center?: Types.ObjectId | null;
    adminNote?: string;
    followUpAssistant?: Types.ObjectId | null;
    joinedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
