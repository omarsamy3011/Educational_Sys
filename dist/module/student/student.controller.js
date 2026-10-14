"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const student_service_1 = require("./student.service");
const successresponce_1 = require("../../common/exceptions/successresponce");
const router = (0, express_1.Router)();
router.get('/profile', auth_middleware_1.auth, async (req, res) => {
    const data = await student_service_1.studentservice.getMyProfile(req.user.id);
    (0, successresponce_1.successResponce)({ res, message: "Profile fetched successfully", data });
});
router.patch('/profile', auth_middleware_1.auth, async (req, res) => {
    const data = await student_service_1.studentservice.updateMyProfile(req.user.id, req.body);
    (0, successresponce_1.successResponce)({ res, message: "Profile updated successfully", data });
});
router.get('/teachers', auth_middleware_1.auth, async (req, res) => {
    const data = await student_service_1.studentservice.getMyTeachers(req.user.id);
    (0, successresponce_1.successResponce)({ res, message: "Teachers fetched successfully", data });
});
router.post('/teachers/:teacherId/request', auth_middleware_1.auth, async (req, res) => {
    const data = await student_service_1.studentservice.sendRequestToTeacher(req.user.id, req.params.teacherId);
    (0, successresponce_1.successResponce)({ res, message: "Request sent successfully", data });
});
router.get('/teachers/:teacherId/overview', auth_middleware_1.auth, async (req, res) => {
    const data = await student_service_1.studentservice.getTeacherOverview(req.user.id, req.params.teacherId);
    (0, successresponce_1.successResponce)({ res, message: "Teacher overview fetched successfully", data });
});
router.get('/teachers/:sessionId/sessions', auth_middleware_1.auth, async (req, res) => {
    const data = await student_service_1.studentservice.getTeacherSessions(req.user.id, req.params.sessionId);
    (0, successresponce_1.successResponce)({ res, message: "Teacher sessions fetched successfully", data });
});
exports.default = router;
