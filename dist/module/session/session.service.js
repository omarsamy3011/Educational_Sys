"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const session_1 = __importDefault(require("../../db/model/session"));
const student_1 = __importDefault(require("../../db/model/student"));
const teacher_1 = __importDefault(require("../../db/model/teacher"));
const db_repo_1 = require("../../db/repository/db.repo");
const mongoose_1 = require("mongoose");
class SessionService {
    sessionRepository;
    teacherRepository;
    studentRepository;
    constructor() {
        this.sessionRepository = new db_repo_1.DatabaseReposatory(session_1.default);
        this.teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default);
        this.studentRepository = new db_repo_1.DatabaseReposatory(student_1.default);
    }
    async createSession(teacherId, data) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        return this.sessionRepository.create({
            ...data,
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            active: false,
            attendance: []
        });
    }
    async getSessions(teacherId) {
        const teacherExists = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        });
        if (!teacherExists) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const sessions = await this.sessionRepository.findall({
            filter: { teacher: teacherId },
            populate: {
                path: "attendance.student",
                select: "firstName lastName userID"
            }
        });
        return sessions.sort((left, right) => right.week - left.week ||
            right.number - left.number ||
            new Date(right.createdAt || 0).getTime() -
                new Date(left.createdAt || 0).getTime());
    }
    async setSessionActive(teacherId, sessionId, active) {
        const session = await this.sessionRepository.findone({
            filter: { _id: sessionId, teacher: teacherId }
        });
        if (!session) {
            throw new error_exceptions_1.NotFoundError("Session not found");
        }
        if (active) {
            await this.sessionRepository.updateMany({
                filter: { teacher: teacherId, active: true, _id: { $ne: sessionId } },
                data: { $set: { active: false } }
            });
        }
        try {
            await this.sessionRepository.updateMany({
                filter: { _id: sessionId, teacher: teacherId },
                data: { $set: { active } }
            });
        }
        catch (error) {
            if (error !== null &&
                typeof error === "object" &&
                "code" in error &&
                error.code === 11000) {
                throw new error_exceptions_1.ConflictError("Another session was activated at the same time");
            }
            throw error;
        }
        const updatedSession = await this.sessionRepository.findone({
            filter: { _id: sessionId, teacher: teacherId }
        });
        if (!updatedSession) {
            throw new error_exceptions_1.NotFoundError("Session not found");
        }
        return updatedSession;
    }
    async markAttendance(teacherId, sessionId, identifier) {
        const session = await this.sessionRepository.findone({
            filter: {
                _id: sessionId,
                teacher: teacherId,
                active: true
            }
        });
        if (!session) {
            throw new error_exceptions_1.NotFoundError("Active session not found");
        }
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const identifierFilter = mongoose_1.Types.ObjectId.isValid(identifier)
            ? { $or: [{ userID: identifier }, { _id: identifier }] }
            : { userID: identifier };
        const student = await this.studentRepository.findone({
            filter: {
                ...identifierFilter,
                _id: { $in: teacher.students }
            },
            select: "_id firstName lastName userID"
        });
        if (!student) {
            throw new error_exceptions_1.NotFoundError("Assigned student not found");
        }
        if (session.attendance.some((entry) => entry.student.equals(student._id))) {
            throw new error_exceptions_1.ConflictError("Student is already marked present");
        }
        const update = await this.sessionRepository.updateMany({
            filter: {
                _id: session._id,
                teacher: teacherId,
                active: true,
                attendance: { $not: { $elemMatch: { student: student._id } } }
            },
            data: {
                $push: {
                    attendance: {
                        student: student._id,
                        markedAt: new Date()
                    }
                }
            }
        });
        if (update.modifiedCount === 0) {
            const stillActive = await this.sessionRepository.findone({
                filter: {
                    _id: session._id,
                    teacher: teacherId,
                    active: true
                },
                select: "_id"
            });
            if (!stillActive) {
                throw new error_exceptions_1.NotFoundError("Active session not found");
            }
            throw new error_exceptions_1.ConflictError("Student is already marked present");
        }
        return {
            session: await this.sessionRepository.findone({
                filter: { _id: session._id },
                populate: {
                    path: "attendance.student",
                    select: "firstName lastName userID"
                }
            }),
            student
        };
    }
}
const sessionService = new SessionService();
exports.default = sessionService;
