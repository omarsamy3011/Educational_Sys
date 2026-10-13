import { z } from "zod";

export const updateCenterProfileSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(1).max(32).optional(),
    textlocation: z.string().trim().max(500).optional(),
    Maplocation: z.string().trim().max(2048).optional(),
    localphone: z.string().trim().max(32).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required"
});

export const inviteCenterTeacherSchema = z.object({
    identifier: z.string().trim().min(1).max(254)
}).strict();

export const answerCenterTeacherSchema = z.object({
    status: z.enum(["active", "rejected"])
}).strict();

export const changeCenterPasswordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128)
}).strict();
