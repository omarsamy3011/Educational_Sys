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
router.patch("/myStudents/:studentId", auth_middleware_1.auth, async (req, res) => {
    const { studentId } = req.params;
    if (typeof studentId !== "string" || !mongoose_1.Types.ObjectId.isValid(studentId)) {
        throw new error_exceptions_1.BadRequestError("Invalid student id");
    }
    const data = await teacher_service_1.default.updateMyStudent(getTeacherId(req), studentId, req.body);
    (0, successresponce_1.successResponce)({ res, message: "Assigned student updated successfully", data });
});
router.get("/assistants", auth_middleware_1.auth, async (req, res) => {
    const data = await teacher_service_1.default.getMyAssistants(getTeacherId(req.user.id));
    (0, successresponce_1.successResponce)({ res, message: "Assigned assistants retrieved successfully", data });
});
exports.default = router;
