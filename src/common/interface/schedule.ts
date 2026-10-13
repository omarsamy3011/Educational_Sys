import { Types } from "mongoose";

export interface ISchedule {
    teacher: Types.ObjectId;
    center?: Types.ObjectId | null;
    title: string;
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
    grade?: string;
    notes?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
