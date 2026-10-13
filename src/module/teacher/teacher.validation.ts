import { z } from "zod";
import { genderEnum } from "../../common/enum/user.enum";

const subjects = ["Math", "Physics", "English", "Science", "Biology", "Chemistry", "Arabic"] as const;
const teachingLanguages = ["Arabic", "English"] as const;

export const updateTeacherProfileSchema = z.object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    profilepic: z.string().trim().max(2048).optional(),
    bio: z.string().trim().max(600).optional(),
    gender: z.enum(genderEnum).optional(),
    companyName: z.string().trim().min(1).max(120).optional(),
    subject: z.array(z.enum(subjects)).optional(),
    teachingLanguage: z.enum(teachingLanguages).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required"
});

export const addTeacherAssistantSchema = z.object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    userName: z.string().trim().min(3).max(80),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(1).max(32),
    password: z.string().min(8).max(128),
    role: z.enum(['Admin', 'Assistant']).optional(),
    permissions: z.array(z.string().trim().min(1).max(64)).max(200).optional()
}).strict();

export const scheduleSlotSchema = z.object({
    title: z.string().trim().min(1).max(120).optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().min(15).max(720).optional(),
    center: z.string().nullable().optional(),
    grade: z.string().max(32).optional(),
    notes: z.string().max(1000).optional(),
    isActive: z.boolean().optional()
}).strict();

export const updateScheduleSlotSchema = scheduleSlotSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "At least one schedule field is required"
});

export const startScheduleSessionSchema = z.object({
    sequence: z.string().trim().min(1).max(160)
}).strict();

export const linkStudentSchema = z.object({
    identifier: z.string().trim().min(1).max(256),
    center: z.preprocess(
        (value) => value === "" ? null : value,
        z.string().trim().nullable().optional()
    ),
    pricePerSession: z.number().finite().min(0).nullable().optional()
}).strict();

export const createTeacherStudentSchema = z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().max(80).optional(),
    phone: z.string().trim().min(1).max(32),
    parentPhone: z.string().trim().min(1).max(32),
    grade: z.preprocess((value) => {
        if (value === "0") return "S1";
        if (value === "1") return "S2";
        if (value === "2") return "S3";
        return value;
    }, z.enum(["S1", "S2", "S3"])),
    gender: z.enum(["male", "female"]).optional(),
    schoolName: z.string().trim().min(1).max(160),
    learningLanguage: z.preprocess((value) => {
        if (value === "0") return "Arabic";
        if (value === "1") return "English";
        return value;
    }, z.enum(["Arabic", "English"])),
    center: z.preprocess(
        (value) => value === "" ? null : value,
        z.string().trim().nullable().optional()
    ),
    pricePerSession: z.number().finite().min(0).nullable().optional(),
    balance: z.number().finite().nullable().optional()
}).strict();

export const importTeacherStudentsSchema = z.object({
    students: z.array(z.record(z.string(), z.unknown())).min(1).max(500)
}).strict();

export const adjustStudentPointsSchema = z.object({
    points: z.number().finite().min(-100000).max(100000).refine((value) => value !== 0),
    reason: z.string().trim().max(1000).optional()
}).strict();

export const adjustStudentBalanceSchema = z.object({
    amount: z.number().finite().min(-100000000).max(100000000).refine((value) => value !== 0),
    reason: z.string().trim().min(1).max(1000)
}).strict();

export const addStudentWarningSchema = z.object({
    reason: z.string().trim().min(1).max(1000)
}).strict();
