"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const sendemail_1 = require("../../common/email/sendemail");
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const security_1 = require("../../common/security/security");
const redisService_1 = require("../../common/service/redisService");
const token_1 = require("../../common/service/token");
const crypto_1 = __importDefault(require("crypto"));
const db_repo_1 = require("../../db/repository/db.repo");
const assistant_1 = __importDefault(require("../../db/model/assistant"));
const center_1 = __importDefault(require("../../db/model/center"));
const parent_1 = __importDefault(require("../../db/model/parent"));
const student_1 = __importDefault(require("../../db/model/student"));
const teacher_1 = __importDefault(require("../../db/model/teacher"));
const counter_1 = __importDefault(require("../../db/model/counter"));
const qrcode_1 = __importDefault(require("qrcode"));
class AuthService {
    assisReposatory;
    centerRepository;
    parentRepository;
    studentRepository;
    teacherRepository;
    tokenService;
    constructor() {
        this.assisReposatory = new db_repo_1.DatabaseReposatory(assistant_1.default);
        this.centerRepository = new db_repo_1.DatabaseReposatory(center_1.default);
        this.parentRepository = new db_repo_1.DatabaseReposatory(parent_1.default);
        this.studentRepository = new db_repo_1.DatabaseReposatory(student_1.default);
        this.teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default);
        this.tokenService = new token_1.TokenService();
    }
    async teacherSignup(data, file) {
        let existingTeacher = await this.teacherRepository.findone({ filter: {
                $or: [
                    { email: data.email },
                    { phone: data.phone },
                    { userName: data.userName },
                    ...(data.companyName ? [{ companyName: data.companyName }] : []),
                ],
            } });
        if (existingTeacher) {
            if (existingTeacher.email === zod_1.email)
                throw new error_exceptions_1.BadRequestError('Email already registered');
            if (existingTeacher.phone === data.phone)
                throw new error_exceptions_1.BadRequestError('Phone number already registered');
            if (existingTeacher.userName === data.userName)
                throw new error_exceptions_1.BadRequestError('Username already taken');
            if (data.companyName && existingTeacher.companyName === data.companyName)
                throw new error_exceptions_1.BadRequestError('Company name already taken');
        }
        let hashedpass = await (0, security_1.genertateHash)({ plainText: data.password });
        data.password = hashedpass;
        let picture;
        const otp = crypto_1.default.randomInt(100000, 1000000).toString();
        try {
            await (0, sendemail_1.sendEmail)({
                to: `${data.email}`,
                subject: `Verify Your Account Please`,
                html: `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 40px 10px;">
        <tr>
        <td align="center">
            <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); padding: 30px;">
            
            <!-- Header / Brand -->
            <tr>
                <td align="center" style="padding-bottom: 20px;">
                <h2 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">Verification Code</h2>
                </td>
            </tr>

            <!-- Content -->
            <tr>
                <td align="center" style="color: #555555; font-size: 15px; line-height: 1.5; padding-bottom: 25px;">
                Please use the one-time verification code below to complete your login. This code is valid for <strong>5 minutes</strong>.
                </td>
            </tr>

            <!-- OTP Box -->
            <tr>
                <td align="center" style="padding-bottom: 25px;">
                <div style="display: inline-block; background-color: #f0f4ff; border: 1px dashed #4f46e5; border-radius: 8px; padding: 15px 35px;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;"><!-- OTP_CODE_HERE -->${otp}</span>
                </div>
                </td>
            </tr>

            <!-- Security Note -->
            <tr>
                <td align="center" style="color: #888888; font-size: 13px; line-height: 1.4;">
                If you didn't request this code, you can safely ignore this email. Someone might have typed your address by mistake.
                </td>
            </tr>

            <!-- Divider -->
            <tr>
                <td style="padding-top: 25px; border-bottom: 1px solid #eeeeee;"></td>
            </tr>

            <!-- Footer -->
            <tr>
                <td align="center" style="padding-top: 20px; color: #aaaaaa; font-size: 12px;">
                &copy; 2026 EduVerse Academy. All rights reserved.
                </td>
            </tr>

            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>`
            });
        }
        catch (error) {
            throw new error_exceptions_1.BadRequestError('No Email Sent Try Again !!');
        }
        redisService_1.redisService.set({ key: `otp::${data.email}`, value: `${await (0, security_1.genertateHash)({ plainText: otp })}`, ttl: 60 * 5 });
        return await this.teacherRepository.create(data);
    }
    async studentSignup(data, file) {
        let existingSTD = await this.studentRepository.findone({ filter: {
                phone: data.phone
            } });
        if (existingSTD) {
            if (existingSTD.phone === data.phone)
                throw new error_exceptions_1.BadRequestError('Phone number already registered');
        }
        let userID;
        do {
            const counter = await counter_1.default.findByIdAndUpdate("studentUserID", { $inc: { sequence: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }).exec();
            if (!counter)
                throw new Error("Unable to generate a student ID.");
            userID = `STU-${String(counter.sequence).padStart(6, "0")}`;
        } while (await student_1.default.exists({ userID }));
        data.userID = userID;
        let hashedpass = await (0, security_1.genertateHash)({ plainText: data.password });
        data.password = hashedpass;
        const qrCode = await qrcode_1.default.toDataURL(userID, { errorCorrectionLevel: "M", margin: 2 });
        await this.studentRepository.create(data);
        return { userID, qrCode };
    }
    async centerSignup(data, file) {
        let existingCenter = await this.centerRepository.findone({ filter: {
                $or: [
                    { phone: data.phone },
                    { name: data.name },
                ]
            } });
        if (existingCenter) {
            if (existingCenter.phone === data.phone)
                throw new error_exceptions_1.BadRequestError('Phone number already registered');
            if (existingCenter.name === data.name)
                throw new error_exceptions_1.BadRequestError('Username already taken');
        }
        let hashedpass = await (0, security_1.genertateHash)({ plainText: data.password });
        data.password = hashedpass;
        let picture;
        return await this.centerRepository.create(data);
    }
    async teacherLogin(data) {
        let { identifier, password } = data;
        let teacherData = await this.teacherRepository.findone({ filter: {
                $or: [{ email: identifier }, { phone: identifier }, { userName: identifier }],
            } });
        if (teacherData) {
            if (!teacherData.confirmEmail)
                throw new error_exceptions_1.BadRequestError('Email Is Not Verified');
            let isMatched = await (0, security_1.compareHash)({ plainText: password, cypherText: teacherData.password });
            if (isMatched) {
                return this.tokenService.generateToken(teacherData);
            }
            else {
                throw new error_exceptions_1.BadRequestError('password invalid');
            }
        }
        else {
            throw new error_exceptions_1.NotFoundError('Teacher Account Not Found');
        }
    }
    async studentLogin(data) {
        let { identifier, password } = data;
        let studentData = await this.studentRepository.findone({ filter: {
                $or: [{ phone: identifier }, { userID: identifier }]
            } });
        if (studentData) {
            let isMatched = await (0, security_1.compareHash)({ plainText: password, cypherText: studentData.password });
            if (isMatched) {
                return this.tokenService.generateToken(studentData);
            }
            else {
                throw new error_exceptions_1.BadRequestError('password invalid');
            }
        }
        else {
            throw new error_exceptions_1.NotFoundError('Student Account Not Found');
        }
    }
    async centerLogin(data) {
        let { identifier, password } = data;
        let centerData = await this.centerRepository.findone({ filter: {
                $or: [{ phone: identifier }, { name: identifier }]
            } });
        if (centerData) {
            let isMatched = await (0, security_1.compareHash)({ plainText: password, cypherText: centerData.password });
            if (isMatched) {
                return this.tokenService.generateToken(centerData);
            }
            else {
                throw new error_exceptions_1.BadRequestError('password invalid');
            }
        }
        else {
            throw new error_exceptions_1.NotFoundError('Center Account Not Found');
        }
    }
    refreshToken(refreshToken) {
        return this.tokenService.refreshAccessToken(refreshToken);
    }
    async teacherVerify(data) {
        let identifier = data.identifier;
        let teacherData = await this.teacherRepository.findone({ filter: {
                $or: [{ email: identifier }, { phone: identifier }, { userName: identifier }],
            } });
        if (teacherData.confirmEmail) {
            throw new error_exceptions_1.BadRequestError('teacher is already verified');
        }
        let hashedotp = await redisService_1.redisService.get({ key: `otp::${teacherData.email}` });
        if (!hashedotp) {
            throw new error_exceptions_1.BadRequestError('OTP Expired , Click To Resend');
        }
        let matchedotp = await (0, security_1.compareHash)({ plainText: data.otp, cypherText: hashedotp });
        if (matchedotp) {
            return await this.teacherRepository.updateone({ filter: { email: teacherData.email }, data: { confirmEmail: true } });
        }
        else {
            throw new error_exceptions_1.BadRequestError('OTP is not correct');
        }
    }
}
exports.default = new AuthService;
