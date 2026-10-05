"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendanceSchema = exports.setSessionActiveSchema = exports.createSessionSchema = void 0;
const zod_1 = require("zod");
exports.createSessionSchema = zod_1.z.object({
    sequence: zod_1.z.string().trim().min(1).max(160),
    week: zod_1.z.number().int().min(1).max(60),
    number: zod_1.z.number().int().min(1).max(999)
});
exports.setSessionActiveSchema = zod_1.z.object({
    active: zod_1.z.boolean()
});
exports.markAttendanceSchema = zod_1.z.object({
    identifier: zod_1.z.string().trim().min(1).max(80)
});
