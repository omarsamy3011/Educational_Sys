import { Router, Response } from "express";
import { Types } from "mongoose";
import { BadRequestError } from "../../common/exceptions/error.exceptions";
import { successResponce } from "../../common/exceptions/successresponce";
import { auth, userRequest } from "../../middleware/auth.middleware";
import assistantModel from "../../db/model/assistant";
import teacherService from "./teacher.service";
import {
    addTeacherAssistantSchema,
    addStudentWarningSchema,
    adjustStudentBalanceSchema,
    adjustStudentPointsSchema,
    createTeacherStudentSchema,
    importTeacherStudentsSchema,
    linkStudentSchema,
    scheduleSlotSchema,
    startScheduleSessionSchema,
    updateScheduleSlotSchema,
    updateTeacherProfileSchema
} from "./teacher.validation";

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

router.post("/assistants", auth, async (req: userRequest, res: Response) => {
    const parsed = addTeacherAssistantSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid assistant data", parsed.error.issues);
    }
    const data = await teacherService.addAssistant(getTeacherId(req), parsed.data)
    successResponce({res,message: "Assistant added successfully",status: 201,data})
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

router.get("/myStudents/:studentId/history", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const data = await teacherService.getStudentHistory(getTeacherId(req), studentId);
    successResponce({ res, message: "Student history retrieved successfully", data });
});

router.post("/myStudents/:studentId/points", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const parsed = adjustStudentPointsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid points adjustment", parsed.error.issues);
    }
    const data = await teacherService.adjustStudentPoints(
        getTeacherId(req),
        studentId,
        parsed.data.points,
        parsed.data.reason
    );
    successResponce({ res, message: "Student points updated successfully", data });
});

router.post("/myStudents/:studentId/balance", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const parsed = adjustStudentBalanceSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid balance adjustment", parsed.error.issues);
    }
    const data = await teacherService.adjustStudentBalance(
        getTeacherId(req),
        studentId,
        parsed.data.amount,
        parsed.data.reason
    );
    successResponce({ res, message: "Student balance updated successfully", data });
});

router.post("/myStudents/:studentId/warnings", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const parsed = addStudentWarningSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid student warning", parsed.error.issues);
    }
    const data = await teacherService.addStudentWarning(getTeacherId(req), studentId, parsed.data.reason);
    successResponce({ res, message: "Student warning added successfully", data });
});

router.patch("/myStudents/:studentId", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const data = await teacherService.updateMyStudent(getTeacherId(req), studentId,req.body);
    successResponce({ res, message: "Assigned student updated successfully", data })
});

router.post("/myStudents/link", auth, async (req: userRequest, res: Response) => {
    const parsed = linkStudentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid student link data", parsed.error.issues);
    }
    const data = await teacherService.linkStudent(getTeacherId(req), parsed.data);
    successResponce({ res, message: "Student linked successfully", status: 201, data });
});

router.post("/myStudents", auth, async (req: userRequest, res: Response) => {
    const parsed = createTeacherStudentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid student data", parsed.error.issues);
    }
    const data = await teacherService.createStudent(getTeacherId(req), parsed.data);
    successResponce({ res, message: "Student account created successfully", status: 201, data });
});

router.post("/myStudents/import", auth, async (req: userRequest, res: Response) => {
    const parsed = importTeacherStudentsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid student import data", parsed.error.issues);
    }
    const data = await teacherService.importStudents(getTeacherId(req), parsed.data.students);
    successResponce({ res, message: "Student import processed successfully", status: 201, data });
});

router.delete("/myStudents/:studentId", auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const reason = req.body?.reason;
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 1000)) {
        throw new BadRequestError("Removal reason must be a string of at most 1000 characters");
    }
    const data = await teacherService.archiveStudent(getTeacherId(req), studentId, reason?.trim() ?? "");
    successResponce({ res, message: "Student removed from class successfully", data });
});

router.get("/assistants", auth, async (req: userRequest, res: Response) => {
    const teacherId = getTeacherId(req);
    const data = await assistantModel.find({ teacher: teacherId }).select("-password -__v").lean();
    successResponce({ res, message: "Assigned assistants retrieved successfully", data })
})

router.get("/dashboard", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getDashboardData(getTeacherId(req));
    successResponce({ res, message: "Dashboard data retrieved successfully", data })
})

router.get("/leaderboard", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getLeaderboard(getTeacherId(req));
    successResponce({ res, message: "Student leaderboard retrieved successfully", data })
})

router.get("/centers", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getMyCenters(getTeacherId(req));
    successResponce({ res, message: "Assigned centers retrieved successfully", data })
})

router.patch("/centers/:centerId", auth, async (req: userRequest, res: Response) => {
    const centerId = Array.isArray(req.params.centerId) ? req.params.centerId[0] : req.params.centerId;
    const status = req.body?.status;
    if (typeof centerId !== "string" || !Types.ObjectId.isValid(centerId)) {
        throw new BadRequestError("Invalid center id")
    }
    if (status !== "active" && status !== "rejected") {
        throw new BadRequestError("Status must be active or rejected")
    }
    const data = await teacherService.answerCenterInvitation(getTeacherId(req), centerId, status);
    successResponce({ res, message: `Center invitation ${status === "active" ? "accepted" : "declined"} successfully`, data })
})

router.delete("/centers/:centerId", auth, async (req: userRequest, res: Response) => {
    const centerId = Array.isArray(req.params.centerId) ? req.params.centerId[0] : req.params.centerId;
    if (typeof centerId !== "string" || !Types.ObjectId.isValid(centerId)) {
        throw new BadRequestError("Invalid center id")
    }
    const data = await teacherService.leaveCenter(getTeacherId(req), centerId);
    successResponce({ res, message: "Center unlinked successfully", data })
})

router.post("/centers/:id/request",auth,async (req: userRequest, res: Response)=>{
    let data = await teacherService.sendCenterRequest(req.params.id as string , getTeacherId(req))
    successResponce({res,message:'request sent successfully',data})
})

router.get("/schedule", auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getMySchedule(getTeacherId(req));
    successResponce({ res, message: "Schedule retrieved successfully", data })
})

router.post("/schedule", auth, async (req: userRequest, res: Response) => {
    const parsed = scheduleSlotSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid schedule slot", parsed.error.issues)
    }
    const data = await teacherService.createScheduleSlot(getTeacherId(req), parsed.data);
    successResponce({ res, message: "Schedule slot created successfully", status: 201, data })
})

router.patch("/schedule/:slotId", auth, async (req: userRequest, res: Response) => {
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
    if (!slotId || !Types.ObjectId.isValid(slotId)) throw new BadRequestError("Invalid schedule slot id")
    const parsed = updateScheduleSlotSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid schedule slot", parsed.error.issues)
    }
    const data = await teacherService.updateScheduleSlot(getTeacherId(req), slotId, parsed.data);
    successResponce({ res, message: "Schedule slot updated successfully", data })
})

router.delete("/schedule/:slotId", auth, async (req: userRequest, res: Response) => {
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
    if (!slotId || !Types.ObjectId.isValid(slotId)) throw new BadRequestError("Invalid schedule slot id")
    const data = await teacherService.deleteScheduleSlot(getTeacherId(req), slotId);
    successResponce({ res, message: "Schedule slot deleted successfully", data })
})

router.post("/schedule/:slotId/start", auth, async (req: userRequest, res: Response) => {
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
    if (!slotId || !Types.ObjectId.isValid(slotId)) throw new BadRequestError("Invalid schedule slot id")
    const parsed = startScheduleSessionSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid session data", parsed.error.issues)
    }
    const data = await teacherService.startScheduledSession(getTeacherId(req), slotId, parsed.data.sequence);
    successResponce({ res, message: "Scheduled session started successfully", status: 201, data })
})

router.get('/requests', auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getMyRequests(getTeacherId(req));
    successResponce({ res, message: "Requests retrieved successfully", data })
})

router.patch('/requests/:id', auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.requestHandling(getTeacherId(req), req.params.id as string , req.body.status);
    successResponce({ res, message: "Requests updated successfully", data })
})

router.get('/archive', auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getMyArchived(getTeacherId(req));
    successResponce({ res, message: "Archived requests retrieved successfully", data })
})

router.get("/scan/lookup", auth, async (req: userRequest, res: Response) => {
    const identifier = req.query.identifier;
    if (typeof identifier !== "string" || !identifier.trim()) {
        throw new BadRequestError("Student identifier is required");
    }
    const data = await teacherService.getScanLookup(getTeacherId(req), identifier);
    successResponce({ res, message: "Student scan lookup retrieved successfully", data });
});

router.post('/archive/:studentId/restore', auth, async (req: userRequest, res: Response) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !Types.ObjectId.isValid(studentId)) {
        throw new BadRequestError("Invalid student id");
    }
    const data = await teacherService.restoreArchivedStudent(getTeacherId(req), studentId);
    successResponce({ res, message: "Student restored successfully", data });
})

router.get('/:id', auth, async (req: userRequest, res: Response) => {
    const data = await teacherService.getTeacherData(req.params.id as string);
    successResponce({ res, message: "Teacher data retrieved successfully", data });
})

export default router;
