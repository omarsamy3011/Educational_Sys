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
const session_service_1 = __importDefault(require("./session.service"));
const session_validation_1 = require("./session.validation");
const router = (0, express_1.Router)();
const getTeacherId = (req) => {
    if (typeof req.user?.id !== "string") {
        throw new error_exceptions_1.BadRequestError("Invalid authenticated user");
    }
    return req.user.id;
};
const getSessionId = (req) => {
    const { sessionId } = req.params;
    if (typeof sessionId !== "string" || !mongoose_1.Types.ObjectId.isValid(sessionId)) {
        throw new error_exceptions_1.BadRequestError("Invalid session id");
    }
    return sessionId;
};
router.get("/sessions", auth_middleware_1.auth, async (req, res) => {
    const data = await session_service_1.default.getSessions(getTeacherId(req));
    (0, successresponce_1.successResponce)({ res, message: "Sessions retrieved successfully", data });
});
router.post("/sessions", auth_middleware_1.auth, async (req, res) => {
    const parsed = session_validation_1.createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid session data", parsed.error.issues);
    }
    const data = await session_service_1.default.createSession(getTeacherId(req), parsed.data);
    (0, successresponce_1.successResponce)({ res, message: "Session created successfully", status: 201, data });
});
router.patch("/sessions/:sessionId/active", auth_middleware_1.auth, async (req, res) => {
    const parsed = session_validation_1.setSessionActiveSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid session state", parsed.error.issues);
    }
    const data = await session_service_1.default.setSessionActive(getTeacherId(req), getSessionId(req), parsed.data.active);
    (0, successresponce_1.successResponce)({ res, message: "Session state updated successfully", data });
});
router.post("/sessions/:sessionId/attendance", auth_middleware_1.auth, async (req, res) => {
    const parsed = session_validation_1.markAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid attendance data", parsed.error.issues);
    }
    const data = await session_service_1.default.markAttendance(getTeacherId(req), getSessionId(req), parsed.data.identifier);
    (0, successresponce_1.successResponce)({ res, message: "Attendance recorded successfully", status: 201, data });
});
exports.default = router;
