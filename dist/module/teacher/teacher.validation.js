"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStudentWarningSchema = exports.adjustStudentBalanceSchema = exports.adjustStudentPointsSchema = exports.importTeacherStudentsSchema = exports.createTeacherStudentSchema = exports.linkStudentSchema = exports.startScheduleSessionSchema = exports.updateScheduleSlotSchema = exports.scheduleSlotSchema = exports.addTeacherAssistantSchema = exports.updateTeacherProfileSchema = void 0;
const zod_1 = require("zod");
const user_enum_1 = require("../../common/enum/user.enum");
const subjects = ["Math", "Physics", "English", "Science", "Biology", "Chemistry", "Arabic"];
const teachingLanguages = ["Arabic", "English"];
exports.updateTeacherProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
    profilepic: zod_1.z.string().trim().max(2048).optional(),
    bio: zod_1.z.string().trim().max(600).optional(),
    gender: zod_1.z.enum(user_enum_1.genderEnum).optional(),
    companyName: zod_1.z.string().trim().min(1).max(120).optional(),
    subject: zod_1.z.array(zod_1.z.enum(subjects)).optional(),
    teachingLanguage: zod_1.z.enum(teachingLanguages).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required"
});
exports.addTeacherAssistantSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
    userName: zod_1.z.string().trim().min(3).max(80),
    email: zod_1.z.string().trim().email().max(254),
    phone: zod_1.z.string().trim().min(1).max(32),
    password: zod_1.z.string().min(8).max(128),
    role: zod_1.z.enum(['Admin', 'Assistant']).optional(),
    permissions: zod_1.z.array(zod_1.z.string().trim().min(1).max(64)).max(200).optional()
}).strict();
exports.scheduleSlotSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(120).optional(),
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: zod_1.z.number().int().min(15).max(720).optional(),
    center: zod_1.z.string().nullable().optional(),
    grade: zod_1.z.string().max(32).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    isActive: zod_1.z.boolean().optional()
}).strict();
exports.updateScheduleSlotSchema = exports.scheduleSlotSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "At least one schedule field is required"
});
exports.startScheduleSessionSchema = zod_1.z.object({
    sequence: zod_1.z.string().trim().min(1).max(160)
}).strict();
exports.linkStudentSchema = zod_1.z.object({
    identifier: zod_1.z.string().trim().min(1).max(256),
    center: zod_1.z.preprocess((value) => value === "" ? null : value, zod_1.z.string().trim().nullable().optional()),
    pricePerSession: zod_1.z.number().finite().min(0).nullable().optional()
}).strict();
exports.createTeacherStudentSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80),
    lastName: zod_1.z.string().trim().max(80).optional(),
    phone: zod_1.z.string().trim().min(1).max(32),
    parentPhone: zod_1.z.string().trim().min(1).max(32),
    grade: zod_1.z.preprocess((value) => {
        if (value === "0")
            return "S1";
        if (value === "1")
            return "S2";
        if (value === "2")
            return "S3";
        return value;
    }, zod_1.z.enum(["S1", "S2", "S3"])),
    gender: zod_1.z.enum(["male", "female"]).optional(),
    schoolName: zod_1.z.string().trim().min(1).max(160),
    learningLanguage: zod_1.z.preprocess((value) => {
        if (value === "0")
            return "Arabic";
        if (value === "1")
            return "English";
        return value;
    }, zod_1.z.enum(["Arabic", "English"])),
    center: zod_1.z.preprocess((value) => value === "" ? null : value, zod_1.z.string().trim().nullable().optional()),
    pricePerSession: zod_1.z.number().finite().min(0).nullable().optional(),
    balance: zod_1.z.number().finite().nullable().optional()
}).strict();
exports.importTeacherStudentsSchema = zod_1.z.object({
    students: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).min(1).max(500)
}).strict();
exports.adjustStudentPointsSchema = zod_1.z.object({
    points: zod_1.z.number().finite().min(-100000).max(100000).refine((value) => value !== 0),
    reason: zod_1.z.string().trim().max(1000).optional()
}).strict();
exports.adjustStudentBalanceSchema = zod_1.z.object({
    amount: zod_1.z.number().finite().min(-100000000).max(100000000).refine((value) => value !== 0),
    reason: zod_1.z.string().trim().min(1).max(1000)
}).strict();
exports.addStudentWarningSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().min(1).max(1000)
}).strict();
