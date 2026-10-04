import { z } from "zod";
import { genderEnum } from "../../common/enum/user.enum";

const subjects = ["Math", "Physics", "English", "Science", "Biology", "Chemistry", "Arabic"] as const;
const teachingLanguages = ["Arabic", "English"] as const;

export const updateTeacherProfileSchema = z.object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    profilepic: z.string().trim().max(2048).optional(),
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
    password: z.string().min(8).max(128)
}).strict();
