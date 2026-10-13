"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const successresponce_1 = require("../../common/exceptions/successresponce");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const center_service_1 = require("./center.service");
const center_validation_1 = require("./center.validation");
const router = (0, express_1.Router)();
const getCenterId = (req) => {
    if (typeof req.user?.id !== "string") {
        throw new error_exceptions_1.BadRequestError("Invalid authenticated center");
    }
    return req.user.id;
};
router.get("/profile", auth_middleware_1.auth, async (req, res) => {
    const data = await center_service_1.centerService.getMyProfile(getCenterId(req));
    (0, successresponce_1.successResponce)({ res, message: "Center profile retrieved successfully", data });
});
router.patch("/profile", auth_middleware_1.auth, async (req, res) => {
    const parsed = center_validation_1.updateCenterProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid center profile data", parsed.error.issues);
    }
    const data = await center_service_1.centerService.updateMyProfile(getCenterId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Center profile updated successfully", data });
});
router.patch("/password", auth_middleware_1.auth, async (req, res) => {
    const parsed = center_validation_1.changeCenterPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid password change data", parsed.error.issues);
    }
    const data = await center_service_1.centerService.changePassword(getCenterId(req), parsed.data.currentPassword, parsed.data.newPassword);
    (0, successresponce_1.successResponce)({ res, message: "Center password updated successfully", data });
});
router.get('/dashboard', auth_middleware_1.auth, async (req, res) => {
    const data = await center_service_1.centerService.getDashboardData(getCenterId(req));
    (0, successresponce_1.successResponce)({ res, message: "Center dashboard data retrieved successfully", data });
});
router.get("/teachers", auth_middleware_1.auth, async (req, res) => {
    const data = await center_service_1.centerService.getCenterTeachers(getCenterId(req));
    (0, successresponce_1.successResponce)({ res, message: "Center teachers retrieved successfully", data });
});
router.post("/teachers/invite", auth_middleware_1.auth, async (req, res) => {
    const parsed = center_validation_1.inviteCenterTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid teacher invitation", parsed.error.issues);
    }
    const data = await center_service_1.centerService.inviteTeacher(getCenterId(req), parsed.data.identifier);
    (0, successresponce_1.successResponce)({ res, message: "Teacher invitation sent successfully", data });
});
router.patch("/teachers/:teacherId", auth_middleware_1.auth, async (req, res) => {
    const teacherId = Array.isArray(req.params.teacherId) ? req.params.teacherId[0] : req.params.teacherId;
    if (!teacherId || !mongoose_1.Types.ObjectId.isValid(teacherId)) {
        throw new error_exceptions_1.BadRequestError("Invalid teacher id");
    }
    const parsed = center_validation_1.answerCenterTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid teacher request status", parsed.error.issues);
    }
    const data = await center_service_1.centerService.answerTeacherRequest(getCenterId(req), teacherId, parsed.data.status);
    (0, successresponce_1.successResponce)({ res, message: `Teacher request ${parsed.data.status === "active" ? "accepted" : "rejected"} successfully`, data });
});
router.delete("/teachers/:teacherId", auth_middleware_1.auth, async (req, res) => {
    const teacherId = Array.isArray(req.params.teacherId) ? req.params.teacherId[0] : req.params.teacherId;
    if (!teacherId || !mongoose_1.Types.ObjectId.isValid(teacherId)) {
        throw new error_exceptions_1.BadRequestError("Invalid teacher id");
    }
    const data = await center_service_1.centerService.removeTeacher(getCenterId(req), teacherId);
    (0, successresponce_1.successResponce)({ res, message: "Teacher removed from center successfully", data });
});
router.get("/schedule", auth_middleware_1.auth, async (req, res) => {
    const data = await center_service_1.centerService.getCenterSchedule(getCenterId(req));
    (0, successresponce_1.successResponce)({ res, message: "Center schedule retrieved successfully", data });
});
router.get("/sessions", auth_middleware_1.auth, async (req, res) => {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const data = await center_service_1.centerService.getCenterSessions(getCenterId(req), from, to);
    (0, successresponce_1.successResponce)({ res, message: "Center sessions retrieved successfully", data });
});
router.get("/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : undefined;
    const data = await center_service_1.centerService.searchCenters(query);
    (0, successresponce_1.successResponce)({ res, message: "Centers searched successfully", data });
});
router.get("/requests", auth_middleware_1.auth, async (req, res) => {
    const data = await center_service_1.centerService.getPendingRequests(getCenterId(req));
    (0, successresponce_1.successResponce)({ res, message: "Pending center join requests retrieved successfully", data });
});
router.patch("/requests/:requestId/:action", auth_middleware_1.auth, async (req, res) => {
    const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
    const action = Array.isArray(req.params.action) ? req.params.action[0] : req.params.action;
    if (!requestId || !mongoose_1.Types.ObjectId.isValid(requestId)) {
        throw new error_exceptions_1.BadRequestError("Invalid request id");
    }
    if (!action || !['accept', 'reject'].includes(action)) {
        throw new error_exceptions_1.BadRequestError("Action must be either accept or reject");
    }
    const data = await center_service_1.centerService.decideRequest(getCenterId(req), requestId, action);
    (0, successresponce_1.successResponce)({ res, message: `Request ${action}ed successfully`, data });
});
exports.default = router;
