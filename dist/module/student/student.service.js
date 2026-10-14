"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentservice = void 0;
const mongoose_1 = require("mongoose");
const enrollment_1 = __importDefault(require("../../db/model/enrollment"));
const request_1 = __importDefault(require("../../db/model/request"));
const student_1 = __importDefault(require("../../db/model/student"));
const teacher_1 = __importDefault(require("../../db/model/teacher"));
const db_repo_1 = require("../../db/repository/db.repo");
const session_1 = __importDefault(require("../../db/model/session"));
const schedule_1 = __importDefault(require("../../db/model/schedule"));
const center_1 = __importDefault(require("../../db/model/center"));
const assistant_1 = __importDefault(require("../../db/model/assistant"));
class studentService {
    studentRepository;
    teacherRepository;
    enrollmentRepository;
    requestRepository;
    sessionRepository;
    constructor(studentRepository = new db_repo_1.DatabaseReposatory(student_1.default), teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default), enrollmentRepository = new db_repo_1.DatabaseReposatory(enrollment_1.default), requestRepository = new db_repo_1.DatabaseReposatory(request_1.default), sessionRepository = new db_repo_1.DatabaseReposatory(session_1.default)) {
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.requestRepository = requestRepository;
        this.sessionRepository = sessionRepository;
    }
    async getMyProfile(id) {
        const data = await this.studentRepository.findById({ id: id,
            select: '-password -createdAt -updatedAt -__v'
        });
        return data;
    }
    async updateMyProfile(id, data) {
        const updatedData = await this.studentRepository.findByIdAndUpdate({ id: id, data: data,
            select: 'firstName lastName parentPhone schoolName profilepic'
        });
        return updatedData;
    }
    async getMyTeachers(id) {
        const teachers = await this.teacherRepository.findall({
            filter: { students: { $in: [id] } },
            select: 'id userName phone companyName firstName lastName subject teachingLanguage  profilepic bio createdAt'
        });
        const enrollment = await this.enrollmentRepository.findall({
            filter: { student: id, archived: false },
            select: 'teacher status joinedAt balance',
            populate: { path: 'teacher', select: 'id userName phone companyName firstName lastName subject teachingLanguage  profilepic bio' }
        });
        return Promise.all(enrollment.map(async (enrol) => {
            return {
                teacher: enrol.teacher,
                status: enrol.status,
                joinedAt: enrol.joinedAt,
                balance: enrol.status === 'active' ? enrol.balance : null
            };
        }));
    }
    async sendRequestToTeacher(studentId, teacherId) {
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: 'id' });
        if (!teacher) {
            throw new Error('Teacher not found');
        }
        const existingRequest = await this.requestRepository.findone({
            filter: { teacher: teacherId, student: studentId, requestedBy: 'student' }
        });
        if (existingRequest) {
            if (existingRequest.status == 'pending') {
                throw new Error('Request already pending');
            }
            if (existingRequest.status == 'accepted') {
                throw new Error('Request already accepted');
            }
        }
        const request = await this.requestRepository.create({
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            student: new mongoose_1.Types.ObjectId(studentId),
            status: 'pending',
            requestedBy: 'student'
        });
        return request;
    }
    async getTeacherOverview(studentId, teacherId) {
        const teacherObjectId = new mongoose_1.Types.ObjectId(teacherId);
        const studentObjectId = new mongoose_1.Types.ObjectId(studentId);
        const [teacher, enrollment] = await Promise.all([
            this.teacherRepository.findById({
                id: teacherId,
                select: "_id firstName lastName"
            }),
            this.enrollmentRepository.findone({
                filter: {
                    teacher: teacherObjectId,
                    student: studentObjectId,
                    status: "active",
                    archived: false
                },
                select: "_id joinedAt balance points warnings isBlocked pricePerSession center followUpAssistant"
            })
        ]);
        if (!teacher) {
            throw new Error("Teacher not found");
        }
        if (!enrollment) {
            throw new Error("No active subscription found");
        }
        const attendanceFilter = {
            attendance: { $elemMatch: { student: studentObjectId } }
        };
        const sessionFilters = [];
        if (enrollment.center) {
            sessionFilters.push({
                $or: [attendanceFilter, { center: enrollment.center }]
            });
        }
        if (enrollment.joinedAt) {
            sessionFilters.push({
                $or: [attendanceFilter, { date: { $gte: enrollment.joinedAt } }]
            });
        }
        const [enrollments, sessions, schedules, center, followUpAssistant] = await Promise.all([
            this.enrollmentRepository.findall({
                filter: {
                    teacher: teacherObjectId,
                    status: "active",
                    archived: false
                },
                select: "student points"
            }),
            session_1.default.find({
                teacher: teacherObjectId,
                ...(sessionFilters.length ? { $and: sessionFilters } : {})
            })
                .select("_id sequence week number date createdAt status active center attendance")
                .sort({ date: -1, createdAt: -1 })
                .lean()
                .exec(),
            schedule_1.default.find({
                teacher: teacherObjectId,
                isActive: true,
                ...(enrollment.center ? { center: enrollment.center } : {})
            })
                .select("_id title dayOfWeek startTime durationMinutes center")
                .lean()
                .exec(),
            enrollment.center
                ? center_1.default.findById(enrollment.center).select("_id name").lean().exec()
                : null,
            enrollment.followUpAssistant
                ? assistant_1.default.findOne({
                    _id: enrollment.followUpAssistant,
                    teacher: teacherObjectId
                }).select("firstName lastName phone").lean().exec()
                : null
        ]);
        const scheduleCenterIds = [...new Set(schedules.map((schedule) => schedule.center ? String(schedule.center) : "").filter(Boolean))];
        const scheduleCenters = scheduleCenterIds.length
            ? await center_1.default.find({ _id: { $in: scheduleCenterIds } }).select("_id name").lean().exec()
            : [];
        const scheduleCenterNames = new Map(scheduleCenters.map((scheduleCenter) => [String(scheduleCenter._id), scheduleCenter.name]));
        const rankedEnrollments = enrollments
            .filter((entry) => entry.student)
            .sort((left, right) => right.points - left.points);
        const rank = rankedEnrollments.findIndex((entry) => String(entry.student) === studentId) + 1;
        const studentSessions = sessions.map((session) => {
            const attendance = session.attendance.find((entry) => String(entry.student) === studentId);
            const status = session.status === "cancelled"
                ? "cancelled"
                : attendance
                    ? "present"
                    : session.active
                        ? "pending"
                        : "absent";
            return {
                session: {
                    _id: String(session._id),
                    sequence: session.sequence,
                    week: session.week,
                    number: session.number,
                    date: session.date ?? session.createdAt
                },
                status
            };
        });
        const countedSessions = studentSessions.filter((row) => row.status === "present" || row.status === "absent");
        const presentCount = countedSessions.filter((row) => row.status === "present").length;
        const now = new Date();
        const minutesNow = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();
        const nextSlot = schedules
            .map((schedule) => {
            const startTimeMinutes = Number(schedule.startTime.slice(0, 2)) * 60 +
                Number(schedule.startTime.slice(3, 5));
            let startsInMinutes = schedule.dayOfWeek * 1440 + startTimeMinutes - minutesNow;
            if (startsInMinutes < 0)
                startsInMinutes += 7 * 1440;
            return {
                ...schedule,
                centerName: schedule.center ? scheduleCenterNames.get(String(schedule.center)) ?? "" : "",
                startsInMinutes
            };
        })
            .sort((left, right) => left.startsInMinutes - right.startsInMinutes)[0] ?? null;
        const followUpName = followUpAssistant
            ? [followUpAssistant.firstName, followUpAssistant.lastName].filter(Boolean).join(" ")
            : "";
        return {
            teacher,
            balance: enrollment.balance ?? 0,
            pricePerSession: enrollment.pricePerSession ?? 80,
            points: enrollment.points,
            rank,
            classSize: rankedEnrollments.length,
            isBlocked: enrollment.isBlocked ?? false,
            centerName: center?.name ?? "",
            warnings: enrollment.warnings ?? [],
            nextSlot,
            lastSession: studentSessions.find((row) => row.status !== "cancelled") ?? null,
            stats: {
                present: presentCount,
                absent: countedSessions.length - presentCount,
                attendanceRate: countedSessions.length
                    ? Math.round((presentCount / countedSessions.length) * 100)
                    : 0,
                homeworkRate: null,
                examAvg: null
            },
            announcements: null,
            followUp: followUpAssistant
                ? { name: followUpName, phone: followUpAssistant.phone ?? "" }
                : null
        };
    }
    async getTeacherSessions(studentId, teacherId) {
        const attendanceFilter = {
            attendance: { $elemMatch: { student: studentId } }
        };
        const session = await this.sessionRepository.findall({
            filter: { teacher: teacherId },
            select: 'sequence week number date center attendance price',
            populate: [{ path: 'center', select: 'name' }]
        });
        const newsession = session.map((ele) => {
            const student = ele.attendance.find((ele) => ele.student.toString() === studentId.toString());
            const status = student ? 'present' : 'absent';
            const markedAt = student ? student.markedAt : null;
            const location = ele.center.name || 'online';
            const homeworkStatus = null;
            const payment = ele.price;
            const comment = '';
            return {
                session: ele,
                status, markedAt, location, homeworkStatus, payment, comment
            };
        });
        return newsession;
    }
}
exports.studentservice = new studentService();
