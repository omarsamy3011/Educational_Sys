"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const successresponce_1 = require("../../common/exceptions/successresponce");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const assistant_1 = __importDefault(require("../../db/model/assistant"));
const teacher_service_1 = __importDefault(require("./teacher.service"));
const teacher_validation_1 = require("./teacher.validation");
const router = (0, express_1.Router)();
const getTeacherId = (req) => {
    if (typeof req.user?.id !== "string") {
        throw new error_exceptions_1.BadRequestError("Invalid authenticated user");
    }
    return req.user.id;
};
router.get("/profile", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMyProfile(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Teacher profile retrieved successfully", data });
});
router.patch("/profile", auth_middleware_1.auth, async (req, res) => {
    const parsed = teacher_validation_1.updateTeacherProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid teacher profile data", parsed.error.issues);
    }
    const data = await teacher_service_1.default.updateMyProfile(getTeacherId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Teacher profile updated successfully", data });
});
router.post("/assistants", auth_middleware_1.auth, async (req, res) => {
    const parsed = teacher_validation_1.addTeacherAssistantSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid assistant data", parsed.error.issues);
    }
    const data = await teacher_service_1.default.addAssistant(getTeacherId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Assistant added successfully", status: 201, data });
});
router.delete("/profile", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.deleteMyProfile(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Teacher profile deleted successfully", data });
});
router.get("/myStudents", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMyStudents(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Assigned students retrieved successfully", data });
});
router.get("/myStudents/:studentId", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const data = await teacher_service_1.default.getMyStudent(getTeacherId(req), studentId);
    (0, successresponce_1.successResponce)({ res, message: "Assigned student retrieved successfully", data });
});
router.get("/myStudents/:studentId/history", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const data = await teacher_service_1.default.getStudentHistory(getTeacherId(req), studentId);
    (0, successresponce_1.successResponce)({ res, message: "Student history retrieved successfully", data });
});
router.post("/myStudents/:studentId/points", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const parsed = teacher_validation_1.adjustStudentPointsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid points adjustment", parsed.error.issues);
    }
    const data = await teacher_service_1.default.adjustStudentPoints(getTeacherId(req), studentId, parsed.data.points, parsed.data.reason);
    (0, successresponce_1.successResponce)({ res, message: "Student points updated successfully", data });
});
router.post("/myStudents/:studentId/balance", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const parsed = teacher_validation_1.adjustStudentBalanceSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid balance adjustment", parsed.error.issues);
    }
    const data = await teacher_service_1.default.adjustStudentBalance(getTeacherId(req), studentId, parsed.data.amount, parsed.data.reason);
    (0, successresponce_1.successResponce)({ res, message: "Student balance updated successfully", data });
});
router.post("/myStudents/:studentId/warnings", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const parsed = teacher_validation_1.addStudentWarningSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid student warning", parsed.error.issues);
    }
    const data = await teacher_service_1.default.addStudentWarning(getTeacherId(req), studentId, parsed.data.reason);
    (0, successresponce_1.successResponce)({ res, message: "Student warning added successfully", data });
});
router.patch("/myStudents/:studentId", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const data = await teacher_service_1.default.updateMyStudent(getTeacherId(req), studentId, req.body);
    (0, successresponce_1.successResponce)({ res, message: "Assigned student updated successfully", data });
});
router.post("/myStudents/link", auth_middleware_1.auth, async (req, res) => {
    const parsed = teacher_validation_1.linkStudentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid student link data", parsed.error.issues);
    }
    const data = await teacher_service_1.default.linkStudent(getTeacherId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Student linked successfully", status: 201, data });
});
router.post("/myStudents", auth_middleware_1.auth, async (req, res) => {
    const parsed = teacher_validation_1.createTeacherStudentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid student data", parsed.error.issues);
    }
    const data = await teacher_service_1.default.createStudent(getTeacherId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Student account created successfully", status: 201, data });
});
router.post("/myStudents/import", auth_middleware_1.auth, async (req, res) => {
    const parsed = teacher_validation_1.importTeacherStudentsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid student import data", parsed.error.issues);
    }
    const data = await teacher_service_1.default.importStudents(getTeacherId(req), parsed.data.students);
    (0, successresponce_1.successResponce)({ res, message: "Student import processed successfully", status: 201, data });
});
router.delete("/myStudents/:studentId", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const reason = req.body?.reason;
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 1000)) {
        throw new error_exceptions_1.BadRequestError("Removal reason must be a string of at most 1000 characters");
    }
    const data = await teacher_service_1.default.archiveStudent(getTeacherId(req), studentId, reason?.trim() ?? "");
    (0, successresponce_1.successResponce)({ res, message: "Student removed from class successfully", data });
});
router.get("/assistants", auth_middleware_1.auth, async (req, res) => {
    const teacherId = getTeacherId(req);
    const data = await assistant_1.default.find({ teacher: teacherId }).select("-password -__v").lean();
    (0, successresponce_1.successResponce)({ res, message: "Assigned assistants retrieved successfully", data });
});
router.get("/dashboard", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getDashboardData(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Dashboard data retrieved successfully", data });
});
router.get("/leaderboard", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getLeaderboard(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Student leaderboard retrieved successfully", data });
});
router.get("/centers", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMyCenters(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Assigned centers retrieved successfully", data });
});
router.patch("/centers/:centerId", auth_middleware_1.auth, async (req, res) => {
    const centerId = Array.isArray(req.params.centerId) ? req.params.centerId[0] : req.params.centerId;
    const status = req.body?.status;
    if (typeof centerId !== "string" || !mongoose_1.Types.ObjectId.isValid(centerId)) {
        throw new error_exceptions_1.BadRequestError("Invalid center id");
    }
    if (status !== "active" && status !== "rejected") {
        throw new error_exceptions_1.BadRequestError("Status must be active or rejected");
    }
    const data = await teacher_service_1.default.answerCenterInvitation(getTeacherId(req), centerId, status);
    (0, successresponce_1.successResponce)({ res, message: `Center invitation ${status === "active" ? "accepted" : "declined"} successfully`, data });
});
router.delete("/centers/:centerId", auth_middleware_1.auth, async (req, res) => {
    const centerId = Array.isArray(req.params.centerId) ? req.params.centerId[0] : req.params.centerId;
    if (typeof centerId !== "string" || !mongoose_1.Types.ObjectId.isValid(centerId)) {
        throw new error_exceptions_1.BadRequestError("Invalid center id");
    }
    const data = await teacher_service_1.default.leaveCenter(getTeacherId(req), centerId);
    (0, successresponce_1.successResponce)({ res, message: "Center unlinked successfully", data });
});
router.post("/centers/:id/request", auth_middleware_1.auth, async (req, res) => {
    let data = await teacher_service_1.default.sendCenterRequest(req.params.id, getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: 'request sent successfully', data });
});
router.get("/schedule", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMySchedule(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Schedule retrieved successfully", data });
});
router.post("/schedule", auth_middleware_1.auth, async (req, res) => {
    const parsed = teacher_validation_1.scheduleSlotSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid schedule slot", parsed.error.issues);
    }
    const data = await teacher_service_1.default.createScheduleSlot(getTeacherId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Schedule slot created successfully", status: 201, data });
});
router.patch("/schedule/:slotId", auth_middleware_1.auth, async (req, res) => {
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
    if (!slotId || !mongoose_1.Types.ObjectId.isValid(slotId))
        throw new error_exceptions_1.BadRequestError("Invalid schedule slot id");
    const parsed = teacher_validation_1.updateScheduleSlotSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid schedule slot", parsed.error.issues);
    }
    const data = await teacher_service_1.default.updateScheduleSlot(getTeacherId(req), slotId, parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Schedule slot updated successfully", data });
});
router.delete("/schedule/:slotId", auth_middleware_1.auth, async (req, res) => {
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
    if (!slotId || !mongoose_1.Types.ObjectId.isValid(slotId))
        throw new error_exceptions_1.BadRequestError("Invalid schedule slot id");
    const data = await teacher_service_1.default.deleteScheduleSlot(getTeacherId(req), slotId);
    (0, successresponce_1.successResponce)({ res, message: "Schedule slot deleted successfully", data });
});
router.post("/schedule/:slotId/start", auth_middleware_1.auth, async (req, res) => {
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
    if (!slotId || !mongoose_1.Types.ObjectId.isValid(slotId))
        throw new error_exceptions_1.BadRequestError("Invalid schedule slot id");
    const parsed = teacher_validation_1.startScheduleSessionSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid session data", parsed.error.issues);
    }
    const data = await teacher_service_1.default.startScheduledSession(getTeacherId(req), slotId, parsed.data.sequence);
    (0, successresponce_1.successResponce)({ res, message: "Scheduled session started successfully", status: 201, data });
});
router.get('/requests', auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMyRequests(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Requests retrieved successfully", data });
});
router.patch('/requests/:id', auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.requestHandling(getTeacherId(req), req.params.id, req.body.status);
    (0, successresponce_1.successResponce)({ res, message: "Requests updated successfully", data });
});
router.get('/archive', auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMyArchived(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Archived requests retrieved successfully", data });
});
router.get("/scan/lookup", auth_middleware_1.auth, async (req, res) => {
    const identifier = req.query.identifier;
    if (typeof identifier !== "string" || !identifier.trim()) {
        throw new error_exceptions_1.BadRequestError("Student identifier is required");
    }
    const data = await teacher_service_1.default.getScanLookup(getTeacherId(req), identifier);
    (0, successresponce_1.successResponce)({ res, message: "Student scan lookup retrieved successfully", data });
});
router.post('/archive/:studentId/restore', auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const data = await teacher_service_1.default.restoreArchivedStudent(getTeacherId(req), studentId);
    (0, successresponce_1.successResponce)({ res, message: "Student restored successfully", data });
});
router.get('/:id', auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getTeacherData(req.params.id);
    (0, successresponce_1.successResponce)({ res, message: "Teacher data retrieved successfully", data });
});
router.get("/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : undefined;
    const data = await teacher_service_1.default.searchTeachers(query);
    (0, successresponce_1.successResponce)({ res, message: "Teachers searched successfully", data });
});
exports.default = router;
