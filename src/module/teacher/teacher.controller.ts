import { Router, Response } from "express";
import { Types } from "mongoose";
import { BadRequestError } from "../../common/exceptions/error.exceptions";
import { successResponce } from "../../common/exceptions/successresponce";
import { auth, userRequest } from "../../middleware/auth.middleware";
import teacherService from "./teacher.service";
import { updateTeacherProfileSchema } from "./teacher.validation";

const router = Router();

const getTeacherId = (req: userRequest): string => {
    if (typeof req.user?.id !== "string") {
        throw new BadRequestError("Invalid authenticated user");
    }
    return req.user.id;
};

router.get("/profile", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getMyProfile(getTeacherId(req));
    successResponce({ res, message: "Teacher profile retrieved successfully", data });
});

router.patch("/profile", auth, async (req: userRequest, res: Response) => {
    const parsed = updateTeacherProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid teacher profile data", parsed.error.issues);
    }
    const data = await teacherService.updateMyProfile(getTeacherId(req), parsed.data);
    successResponce({ res, message: "Teacher profile updated successfully", data });
});

router.delete("/profile", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.deleteMyProfile(getTeacherId(req));
    successResponce({ res, message: "Teacher profile deleted successfully", data });
});

router.get("/myStudents", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getMyStudents(getTeacherId(req));
    successResponce({ res, message: "Assigned students retrieved successfully", data });
});

router.get("/myStudents/:studentId", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const data = await teacherService.getMyStudent(getTeacherId(req), studentId);
    successResponce({ res, message: "Assigned student retrieved successfully", data });
});

export default router;
