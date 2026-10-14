"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionClosingSchema = exports.markAttendanceSchema = exports.setSessionActiveSchema = exports.createSessionSchema = void 0;
const zod_1 = require("zod");
exports.createSessionSchema = zod_1.z.object({
    sequence: zod_1.z.string().trim().min(1).max(160),
    week: zod_1.z.number().int().min(1).max(60),
    number: zod_1.z.number().int().min(1).max(999),
    center: zod_1.z.string().trim().transform(value => value || null)
        .pipe(zod_1.z.union([zod_1.z.string().regex(/^[a-f\d]{24}$/i), zod_1.z.null()])).optional(),
    grade: zod_1.z.string().trim().optional(),
    date: zod_1.z.coerce.date().optional(),
    price: zod_1.z.number().finite().min(0).nullable().optional()
});
exports.setSessionActiveSchema = zod_1.z.object({
    active: zod_1.z.boolean()
});
exports.markAttendanceSchema = zod_1.z.object({
    identifier: zod_1.z.string().trim().min(1).max(80)
});
exports.sessionClosingSchema = zod_1.z.object({
    normalCost: zod_1.z.number().min(0),
    reducedCost: zod_1.z.number().min(0),
    reducedCount: zod_1.z.number().int().min(0),
    notes: zod_1.z.string().max(1000).optional()
}).strict();
