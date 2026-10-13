"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = __importDefault(require("./auth.service"));
const successresponce_1 = require("../../common/exceptions/successresponce");
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const multer_enum_1 = require("../../common/enum/multer.enum");
const cloud_1 = require("../../common/service/multer/cloud");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).max(4096)
});
const forgotPasswordSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1).max(256)
});
const resetPasswordSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1).max(256),
    otp: zod_1.z.string().min(4).max(8),
    password: zod_1.z.string().min(6).max(256)
});
const resendOtpSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1).max(256),
    purpose: zod_1.z.enum(['verify', 'reset-password']).optional()
});
router.post('/signup/teacher', (0, cloud_1.uploadFile)({ storageType: multer_enum_1.MulterStorageEnums.diskStorage }).single('file'), async (req, res) => {
    let data = await auth_service_1.default.teacherSignup(req.body, req.file);
    (0, successresponce_1.successResponce)({ res, message: 'signned up successfully', data: data });
});
router.post('/signup/student', (0, cloud_1.uploadFile)({ storageType: multer_enum_1.MulterStorageEnums.diskStorage }).single('file'), async (req, res) => {
    let data = await auth_service_1.default.studentSignup(req.body, req.file);
    (0, successresponce_1.successResponce)({ res, message: 'signned up successfully', data: data });
});
router.post('/signup/center', (0, cloud_1.uploadFile)({ storageType: multer_enum_1.MulterStorageEnums.diskStorage }).single('file'), async (req, res) => {
    let data = await auth_service_1.default.centerSignup(req.body, req.file);
    (0, successresponce_1.successResponce)({ res, message: 'signned up successfully', data: data });
});
router.post('/login/teacher', async (req, res) => {
    let data = await auth_service_1.default.teacherLogin(req.body);
    (0, successresponce_1.successResponce)({ res, message: 'logged in successfully', data: data });
});
router.post('/login/student', async (req, res) => {
    let data = await auth_service_1.default.studentLogin(req.body);
    (0, successresponce_1.successResponce)({ res, message: 'logged in successfully', data: data });
});
router.post('/login/center', async (req, res) => {
    let data = await auth_service_1.default.centerLogin(req.body);
    (0, successresponce_1.successResponce)({ res, message: 'logged in successfully', data: data });
});
router.post('/refresh-token', async (req, res) => {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError("Invalid refresh token request", parsed.error.issues);
    }
    const data = auth_service_1.default.refreshToken(parsed.data.refreshToken);
    (0, successresponce_1.successResponce)({ res, message: 'access token refreshed successfully', data });
});
router.post('/verify-acc', async (req, res) => {
    let data = await auth_service_1.default.teacherVerify(req.body);
    (0, successresponce_1.successResponce)({ res, message: 'account veryfied successfully', data: data });
});
router.post(['/forgot-password', '/forgot-password/:role'], async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError('Invalid forgot password request', parsed.error.issues);
    }
    const data = await auth_service_1.default.forgotPassword(parsed.data);
    (0, successresponce_1.successResponce)({ res, message: 'Reset code sent successfully', data });
});
router.post(['/reset-password', '/reset-password/:role'], async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError('Invalid reset password request', parsed.error.issues);
    }
    const data = await auth_service_1.default.resetPassword(parsed.data);
    (0, successresponce_1.successResponce)({ res, message: 'Password reset successfully', data });
});
router.post('/resend-otp', async (req, res) => {
    const parsed = resendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new error_exceptions_1.BadRequestError('Invalid resend OTP request', parsed.error.issues);
    }
    const data = await auth_service_1.default.resendOtp(parsed.data.purpose
        ? { identifier: parsed.data.identifier, purpose: parsed.data.purpose }
        : { identifier: parsed.data.identifier });
    (0, successresponce_1.successResponce)({ res, message: 'OTP resent successfully', data });
});
exports.default = router;
