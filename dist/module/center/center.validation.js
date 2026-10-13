"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeCenterPasswordSchema = exports.answerCenterTeacherSchema = exports.inviteCenterTeacherSchema = exports.updateCenterProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateCenterProfileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(120).optional(),
    phone: zod_1.z.string().trim().min(1).max(32).optional(),
    textlocation: zod_1.z.string().trim().max(500).optional(),
    Maplocation: zod_1.z.string().trim().max(2048).optional(),
    localphone: zod_1.z.string().trim().max(32).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required"
});
exports.inviteCenterTeacherSchema = zod_1.z.object({
    identifier: zod_1.z.string().trim().min(1).max(254)
}).strict();
exports.answerCenterTeacherSchema = zod_1.z.object({
    status: zod_1.z.enum(["active", "rejected"])
}).strict();
exports.changeCenterPasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1).max(128),
    newPassword: zod_1.z.string().min(8).max(128)
}).strict();
