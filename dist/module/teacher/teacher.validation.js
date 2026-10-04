"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTeacherAssistantSchema = exports.updateTeacherProfileSchema = void 0;
const zod_1 = require("zod");
const user_enum_1 = require("../../common/enum/user.enum");
const subjects = ["Math", "Physics", "English", "Science", "Biology", "Chemistry", "Arabic"];
const teachingLanguages = ["Arabic", "English"];
exports.updateTeacherProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
    profilepic: zod_1.z.string().trim().max(2048).optional(),
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
    password: zod_1.z.string().min(8).max(128)
}).strict();
