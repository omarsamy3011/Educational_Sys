import { Types } from "mongoose";

export type RequestStatus = "pending" | "accepted" | "rejected";
export type RequestDirection = "teacher" | "center" | "student";

export interface IRequest {
    teacher: Types.ObjectId;
    center?: Types.ObjectId;
    student?: Types.ObjectId;
    status: RequestStatus;
    requestedBy?: RequestDirection;
    createdAt?: Date;
    updatedAt?: Date;
}
