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
