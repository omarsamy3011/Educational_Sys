"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherService = void 0;
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const teacher_1 = __importDefault(require("../../db/model/teacher"));
const student_1 = __importDefault(require("../../db/model/student"));
const assistant_1 = __importDefault(require("../../db/model/assistant"));
const center_1 = __importDefault(require("../../db/model/center"));
const session_1 = __importDefault(require("../../db/model/session"));
const request_1 = __importDefault(require("../../db/model/request"));
const db_repo_1 = require("../../db/repository/db.repo");
const security_1 = require("../../common/security/security");
const node_crypto_1 = __importDefault(require("node:crypto"));
const mongoose_1 = require("mongoose");
const schedule_1 = __importDefault(require("../../db/model/schedule"));
const enrollment_1 = __importDefault(require("../../db/model/enrollment"));
const counter_1 = __importDefault(require("../../db/model/counter"));
const teacher_validation_1 = require("./teacher.validation");
class TeacherService {
    teacherRepository;
    studentRepository;
    assistantRepository;
    centerRepository;
    requestRepository;
    scheduleRepository;
    sessionRepository;
    enrollmentRepository;
    constructor() {
        this.teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default);
        this.studentRepository = new db_repo_1.DatabaseReposatory(student_1.default);
        this.assistantRepository = new db_repo_1.DatabaseReposatory(assistant_1.default);
        this.centerRepository = new db_repo_1.DatabaseReposatory(center_1.default);
        this.requestRepository = new db_repo_1.DatabaseReposatory(request_1.default);
        this.scheduleRepository = new db_repo_1.DatabaseReposatory(schedule_1.default);
        this.sessionRepository = new db_repo_1.DatabaseReposatory(session_1.default);
        this.enrollmentRepository = new db_repo_1.DatabaseReposatory(enrollment_1.default);
    }
    async getMyProfile(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "-password -__v"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        return teacher;
    }
    async searchTeachers(query) {
        const normalizedQuery = query?.trim();
        const terms = normalizedQuery
            ? normalizedQuery.split(/\s+/).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            : [];
        const teachers = await this.teacherRepository.findall({
            filter: terms.length
                ? {
                    $and: terms.map((term) => ({
                        $or: [
                            { firstName: { $regex: term, $options: "i" } },
                            { lastName: { $regex: term, $options: "i" } },
                            { userName: { $regex: term, $options: "i" } },
                            { companyName: { $regex: term, $options: "i" } },
                            { subject: { $regex: term, $options: "i" } }
                        ]
                    }))
                }
                : {},
            select: "_id userName firstName lastName email phone companyName subject teachingLanguage gender profilepic createdAt"
        });
        return teachers;
    }
    async updateMyProfile(teacherId, data) {
        if (data.companyName) {
            const existingTeacher = await this.teacherRepository.findone({
                filter: {
                    companyName: data.companyName,
                    _id: { $ne: teacherId }
                }
            });
            if (existingTeacher) {
                throw new error_exceptions_1.ConflictError("Company name already taken");
            }
        }
        const result = await this.teacherRepository.updateone({
            filter: { _id: teacherId },
            data: { $set: data }
        });
        if (result.matchedCount === 0) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        return this.getMyProfile(teacherId);
    }
    async deleteMyProfile(teacherId) {
        const teacher = await this.teacherRepository.deleteById(teacherId);
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        return { id: teacherId };
    }
    async getMyStudents(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            populate: [{
                    path: "students",
                    select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
                }],
            select: 'students'
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        return teacher.students;
    }
    async getMyStudent(teacherId, studentId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const isAssigned = teacher.students.some((id) => String(id) === studentId);
        if (!isAssigned) {
            throw new error_exceptions_1.NotFoundError("Student not found");
        }
        const [student, enrollment] = await Promise.all([
            this.studentRepository.findById({
                id: studentId,
                select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage balance pricePerSession isBlocked center"
            }),
            this.enrollmentRepository.findone({
                filter: {
                    teacher: new mongoose_1.Types.ObjectId(teacherId),
                    student: new mongoose_1.Types.ObjectId(studentId),
                    status: "active",
                    archived: false
                }
            })
        ]);
        if (!student) {
            throw new error_exceptions_1.NotFoundError("Student not found");
        }
        return {
            ...student.toObject(),
            ...(enrollment ? {
                balance: enrollment.balance,
                points: enrollment.points,
                isBlocked: enrollment.isBlocked,
                pricePerSession: enrollment.pricePerSession,
                center: enrollment.center,
                adminNote: enrollment.adminNote,
                followUpAssistant: enrollment.followUpAssistant
            } : {})
        };
    }
    async getStudentHistory(teacherId, studentId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(studentId)
            },
            select: "_id pointsHistory transactionHistory warnings"
        });
        const isAssigned = teacher.students.some((id) => String(id) === studentId);
        if (!isAssigned && !enrollment) {
            throw new error_exceptions_1.NotFoundError("Student not found");
        }
        const sessions = await session_1.default.find({
            teacher: new mongoose_1.Types.ObjectId(teacherId)
        }).sort({ date: -1, createdAt: -1 }).lean().exec();
        const attendance = sessions.map((session) => {
            const row = session.attendance.find((item) => String(item.student) === studentId);
            const status = session.status === "cancelled"
                ? "cancelled"
                : row
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
                status,
                markedAt: row?.markedAt ?? null,
                payment: 0,
                comment: "",
                homeworkStatus: null,
                markedBy: null
            };
        });
        const counted = attendance.filter((row) => row.status === "present" || row.status === "absent");
        const present = counted.filter((row) => row.status === "present").length;
        return {
            attendance,
            exams: [],
            homework: [],
            warnings: (enrollment?.warnings ?? [])
                .slice()
                .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
                .map((warning) => ({
                _id: warning._id ? String(warning._id) : undefined,
                reason: warning.reason,
                createdAt: warning.createdAt,
                byName: "Teacher"
            })),
            points: (enrollment?.pointsHistory ?? [])
                .slice()
                .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
                .map((entry) => ({
                points: entry.points,
                reason: entry.reason,
                createdAt: entry.createdAt,
                byName: "Teacher"
            })),
            transactions: (enrollment?.transactionHistory ?? [])
                .slice()
                .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
                .map((entry) => ({
                _id: String(entry._id),
                amount: entry.amount,
                type: entry.type,
                reason: entry.reason,
                createdAt: entry.createdAt,
                byName: "Teacher"
            })),
            booklets: [],
            lessons: [],
            stats: {
                present,
                absent: counted.length - present,
                attendanceRate: counted.length ? Math.round((present / counted.length) * 100) : 0,
                homeworkRate: 0,
                examAvg: 0
            }
        };
    }
    async getScanLookup(teacherId, identifier) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const normalizedIdentifier = identifier.trim();
        const idFilter = mongoose_1.Types.ObjectId.isValid(normalizedIdentifier)
            ? [{ _id: normalizedIdentifier }, { userID: normalizedIdentifier }, { phone: normalizedIdentifier }]
            : [{ userID: normalizedIdentifier }, { phone: normalizedIdentifier }];
        const student = await this.studentRepository.findone({
            filter: {
                _id: { $in: teacher.students },
                $or: idFilter
            },
            select: "_id userID firstName lastName phone profilepic gender grade schoolName learningLanguage balance pricePerSession isBlocked center"
        });
        if (!student) {
            throw new error_exceptions_1.NotFoundError("No student in your class matches that code");
        }
        const [enrollment, activeSession, sessions] = await Promise.all([
            this.enrollmentRepository.findone({
                filter: {
                    teacher: new mongoose_1.Types.ObjectId(teacherId),
                    student: new mongoose_1.Types.ObjectId(String(student._id)),
                    status: "active",
                    archived: false
                },
                select: "balance points isBlocked pricePerSession center adminNote followUpAssistant warnings"
            }),
            session_1.default.findOne({
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                active: true
            }).exec(),
            session_1.default.find({
                teacher: new mongoose_1.Types.ObjectId(teacherId)
            }).sort({ date: -1, createdAt: -1 }).limit(5).exec()
        ]);
        const balance = enrollment?.balance ?? student.balance ?? 0;
        const price = enrollment?.pricePerSession ?? student.pricePerSession ?? 0;
        const isBlocked = enrollment?.isBlocked ?? student.isBlocked ?? false;
        const activeAttendance = activeSession?.attendance.find((row) => String(row.student) === String(student._id));
        const warnings = enrollment?.warnings ?? [];
        const reasons = [];
        if (isBlocked)
            reasons.push("Student is blocked");
        if (warnings.length >= 3)
            reasons.push(`${warnings.length} warnings`);
        if (!activeAttendance && balance < price) {
            reasons.push(`Balance ${balance} is less than the session price ${price}`);
        }
        const [center, followUpAssistant] = await Promise.all([
            enrollment?.center
                ? this.centerRepository.findById({
                    id: String(enrollment.center),
                    select: "name"
                })
                : null,
            enrollment?.followUpAssistant
                ? this.assistantRepository.findById({
                    id: String(enrollment.followUpAssistant),
                    select: "firstName lastName userName phone"
                })
                : null
        ]);
        return {
            student: {
                ...student.toObject(),
                balance,
                pricePerSession: price,
                isBlocked,
                center: enrollment?.center ?? student.center,
                centerName: center?.name ?? "",
                adminNote: enrollment?.adminNote ?? "",
                followUpAssistant: enrollment?.followUpAssistant ?? null,
                followUpAssistantName: followUpAssistant
                    ? `${followUpAssistant.firstName ?? ""} ${followUpAssistant.lastName ?? ""}`.trim() || followUpAssistant.userName
                    : ""
            },
            activeSession,
            attended: Boolean(activeAttendance),
            attendance: activeAttendance ?? null,
            price,
            allowed: reasons.length === 0,
            reasons,
            warnings: warnings.map((warning) => ({
                _id: warning._id ? String(warning._id) : undefined,
                reason: warning.reason,
                createdAt: warning.createdAt
            })),
            booklets: [],
            lastSessions: sessions
                .filter((session) => !activeSession || String(session._id) !== String(activeSession._id))
                .slice(0, 4)
                .map((session) => {
                const row = session.attendance.find((entry) => String(entry.student) === String(student._id));
                return {
                    session: {
                        _id: String(session._id),
                        sequence: session.sequence,
                        week: session.week,
                        number: session.number,
                        date: session.date ?? session.createdAt
                    },
                    status: session.status === "cancelled"
                        ? "cancelled"
                        : row
                            ? "present"
                            : "absent"
                };
            })
        };
    }
    async adjustStudentPoints(teacherId, studentId, points, reason = "") {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        });
        if (!enrollment) {
            throw new error_exceptions_1.NotFoundError("Active student enrollment not found");
        }
        const updatedEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $inc: { points },
                $push: {
                    pointsHistory: {
                        points,
                        reason: reason.trim(),
                        by: new mongoose_1.Types.ObjectId(teacherId),
                        createdAt: new Date()
                    }
                }
            },
            select: "points pointsHistory"
        });
        if (!updatedEnrollment) {
            throw new error_exceptions_1.NotFoundError("Active student enrollment not found");
        }
        return {
            points: updatedEnrollment.points,
            entry: updatedEnrollment.pointsHistory?.at(-1)
        };
    }
    async adjustStudentBalance(teacherId, studentId, amount, reason) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        });
        if (!enrollment) {
            throw new error_exceptions_1.NotFoundError("Active student enrollment not found");
        }
        const updatedEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $inc: { balance: amount },
                $push: {
                    transactionHistory: {
                        amount,
                        type: "adjustment",
                        reason: reason.trim(),
                        by: new mongoose_1.Types.ObjectId(teacherId),
                        createdAt: new Date()
                    }
                },
            },
            select: "balance transactionHistory"
        });
        if (!updatedEnrollment) {
            throw new error_exceptions_1.NotFoundError("Active student enrollment not found");
        }
        return {
            balance: updatedEnrollment.balance,
            transaction: updatedEnrollment.transactionHistory?.at(-1)
        };
    }
    async addStudentWarning(teacherId, studentId, reason) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        });
        if (!enrollment) {
            throw new error_exceptions_1.NotFoundError("Active student enrollment not found");
        }
        const updatedEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $push: {
                    warnings: {
                        reason: reason.trim(),
                        by: new mongoose_1.Types.ObjectId(teacherId),
                        createdAt: new Date()
                    }
                }
            },
            select: "warnings isBlocked"
        });
        if (!updatedEnrollment) {
            throw new error_exceptions_1.NotFoundError("Active student enrollment not found");
        }
        const shouldBlock = (updatedEnrollment.warnings?.length ?? 0) >= 3;
        if (shouldBlock && !updatedEnrollment.isBlocked) {
            await this.enrollmentRepository.findByIdAndUpdate({
                id: String(enrollment._id),
                data: { $set: { isBlocked: true } },
                select: "isBlocked"
            });
        }
        return {
            warning: updatedEnrollment.warnings?.at(-1),
            warningCount: updatedEnrollment.warnings?.length ?? 0,
            isBlocked: shouldBlock || updatedEnrollment.isBlocked
        };
    }
    async updateMyStudent(teacherId, studentId, data) {
        const teacher = await this.teacherRepository.findone({
            filter: { _id: teacherId,
                students: { $in: [studentId] }
            },
            select: 'id'
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher Is not Teaching This Student");
        }
        const updatedStudent = await this.studentRepository.findByIdAndUpdate({
            id: studentId,
            data: data,
            select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage parentPhone balance"
        });
        if (!updatedStudent) {
            throw new error_exceptions_1.NotFoundError("Student not found");
        }
        return updatedStudent;
    }
    async archiveStudent(teacherId, studentId, reason) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        });
        if (!enrollment) {
            throw new error_exceptions_1.NotFoundError("Student enrollment not found");
        }
        const archivedAt = new Date();
        const archivedEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $set: {
                    archived: true,
                    archivedAt,
                    removedReason: reason
                }
            },
            populate: {
                path: "student",
                select: "_id firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
            }
        });
        if (!archivedEnrollment) {
            throw new error_exceptions_1.NotFoundError("Student enrollment not found");
        }
        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $pull: { students: new mongoose_1.Types.ObjectId(studentId) } },
            select: "_id"
        });
        return {
            student: archivedEnrollment.student,
            removedAt: archivedEnrollment.archivedAt,
            reason: archivedEnrollment.removedReason,
            balance: archivedEnrollment.balance
        };
    }
    async importStudents(teacherId, rows) {
        const created = [];
        const skipped = [];
        for (const row of rows) {
            if (!String(row.grade ?? "").trim()) {
                skipped.push({ row, reason: "Grade is required" });
                continue;
            }
            if (!String(row.learningLanguage ?? "").trim()) {
                skipped.push({ row, reason: "Learning language is required" });
                continue;
            }
            const parsed = teacher_validation_1.createTeacherStudentSchema.safeParse(row);
            if (!parsed.success) {
                skipped.push({
                    row,
                    reason: parsed.error.issues[0]?.message ?? "Invalid student data"
                });
                continue;
            }
            try {
                const result = await this.createStudent(teacherId, parsed.data);
                created.push({
                    name: [result.student.firstName, result.student.lastName].filter(Boolean).join(" "),
                    userID: result.userID,
                    password: result.password
                });
            }
            catch (error) {
                if (error instanceof error_exceptions_1.ConflictError || error instanceof error_exceptions_1.BadRequestError || error instanceof error_exceptions_1.NotFoundError) {
                    skipped.push({
                        row,
                        reason: error.message
                    });
                    continue;
                }
                throw error;
            }
        }
        return { created, skipped };
    }
    async linkStudent(teacherId, data) {
        const identifier = data.identifier.trim();
        const student = await this.studentRepository.findone({
            filter: {
                $or: [{ userID: identifier }, { phone: identifier }]
            },
            select: "_id userID firstName lastName phone parentPhone profilepic gender grade schoolName learningLanguage"
        });
        if (!student) {
            throw new error_exceptions_1.NotFoundError("No student account matches that code or phone number");
        }
        const existingEnrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(String(student._id))
            },
            select: "_id archived"
        });
        if (existingEnrollment) {
            throw new error_exceptions_1.ConflictError(existingEnrollment.archived
                ? "This student was previously in your class; restore them from the Removed tab"
                : "This student is already linked to your class");
        }
        let center = null;
        if (data.center) {
            if (!mongoose_1.Types.ObjectId.isValid(data.center)) {
                throw new error_exceptions_1.BadRequestError("Invalid center id");
            }
            center = new mongoose_1.Types.ObjectId(data.center);
            const teacher = await this.teacherRepository.findone({
                filter: { _id: teacherId, center: center },
                select: "_id"
            });
            if (!teacher) {
                throw new error_exceptions_1.BadRequestError("The selected center is not linked to your account");
            }
        }
        const enrollment = await this.enrollmentRepository.create({
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            student: new mongoose_1.Types.ObjectId(String(student._id)),
            status: "active",
            archived: false,
            balance: 0,
            points: 0,
            isBlocked: false,
            pricePerSession: data.pricePerSession ?? 0,
            center,
            adminNote: "",
            followUpAssistant: null,
            joinedAt: new Date()
        });
        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $addToSet: { students: new mongoose_1.Types.ObjectId(String(student._id)) } },
            select: "_id"
        });
        return {
            ...student.toObject(),
            enrollmentId: String(enrollment._id),
            status: enrollment.status,
            balance: enrollment.balance,
            points: enrollment.points,
            pricePerSession: enrollment.pricePerSession,
            center: enrollment.center,
            joinedAt: enrollment.joinedAt
        };
    }
    async createStudent(teacherId, data) {
        const existingStudent = await this.studentRepository.findone({
            filter: { phone: data.phone },
            select: "_id"
        });
        if (existingStudent) {
            throw new error_exceptions_1.ConflictError("Phone number already registered");
        }
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id center"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        let center = null;
        if (data.center) {
            if (!mongoose_1.Types.ObjectId.isValid(data.center)) {
                throw new error_exceptions_1.BadRequestError("Invalid center id");
            }
            center = new mongoose_1.Types.ObjectId(data.center);
            if (!(teacher.center ?? []).some((centerId) => String(centerId) === String(center))) {
                throw new error_exceptions_1.BadRequestError("The selected center is not linked to your account");
            }
        }
        let userID;
        do {
            const counter = await counter_1.default.findByIdAndUpdate("studentUserID", { $inc: { sequence: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }).exec();
            if (!counter) {
                throw new Error("Unable to generate a student ID.");
            }
            userID = `STU-${String(counter.sequence).padStart(6, "0")}`;
        } while (await student_1.default.exists({ userID }));
        const password = node_crypto_1.default.randomBytes(12).toString("base64url");
        const balance = data.balance ?? 0;
        const pricePerSession = data.pricePerSession ?? 0;
        const student = await this.studentRepository.create({
            userID,
            password: await (0, security_1.genertateHash)({ plainText: password }),
            phone: data.phone,
            parentPhone: data.parentPhone,
            firstName: data.firstName,
            ...(data.lastName === undefined ? {} : { lastName: data.lastName }),
            grade: data.grade,
            gender: data.gender ?? "male",
            schoolName: data.schoolName,
            learningLanguage: data.learningLanguage,
            balance,
            pricePerSession,
            isBlocked: false,
            createdAt: new Date(),
            ...(center === null ? {} : { center })
        });
        const enrollment = await this.enrollmentRepository.create({
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            student: new mongoose_1.Types.ObjectId(String(student._id)),
            status: "active",
            archived: false,
            balance,
            points: 0,
            isBlocked: false,
            pricePerSession,
            center,
            adminNote: "",
            followUpAssistant: null,
            joinedAt: new Date()
        });
        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $addToSet: { students: new mongoose_1.Types.ObjectId(String(student._id)) } },
            select: "_id"
        });
        return {
            userID,
            password,
            student: {
                _id: String(student._id),
                userID,
                firstName: student.firstName,
                lastName: student.lastName,
                phone: student.phone,
                parentPhone: student.parentPhone,
                grade: student.grade,
                schoolName: student.schoolName,
                learningLanguage: student.learningLanguage,
                profilepic: student.profilepic,
                enrollmentId: String(enrollment._id),
                balance,
                points: 0,
                pricePerSession,
                center
            }
        };
    }
    async addAssistant(teacherId, data) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const existingAssistant = await this.assistantRepository.findone({
            filter: {
                $or: [
                    { email: data.email },
                    { userName: data.userName },
                    { phone: data.phone }
                ]
            }
        });
        if (existingAssistant) {
            if (existingAssistant.email === data.email) {
                throw new error_exceptions_1.ConflictError("Email already registered");
            }
            if (existingAssistant.userName === data.userName) {
                throw new error_exceptions_1.ConflictError("Username already taken");
            }
            if (existingAssistant.phone === data.phone) {
                throw new error_exceptions_1.ConflictError("Phone number already registered");
            }
        }
        const assistantData = {
            userName: data.userName,
            email: data.email,
            phone: data.phone,
            password: await (0, security_1.genertateHash)({ plainText: data.password }),
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            createdAt: new Date(),
            ...(data.firstName === undefined ? {} : { firstName: data.firstName }),
            ...(data.lastName === undefined ? {} : { lastName: data.lastName }),
            ...(data.role === undefined ? {} : { role: data.role }),
            ...(data.permissions === undefined ? {} : { permissions: data.permissions })
        };
        const assistant = await this.assistantRepository.create(assistantData);
        return {
            id: String(assistant._id),
            userName: assistant.userName,
            email: assistant.email,
            phone: assistant.phone,
            firstName: assistant.firstName,
            lastName: assistant.lastName,
            role: assistant.role,
            teacher: String(assistant.teacher)
        };
    }
    async getMyAssistants(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            populate: [{
                    path: "assistants",
                    select: "userName email phone firstName lastName"
                }],
            select: "assistants"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        return teacher.assistants;
    }
    async getDashboardData(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students center"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const [students, centers, assistants, sessions] = await Promise.all([
            student_1.default.find({ _id: { $in: teacher.students } })
                .select("firstName lastName userID phone balance pricePerSession isBlocked center grade")
                .exec(),
            center_1.default.find({ _id: { $in: teacher.center } })
                .select("name")
                .exec(),
            assistant_1.default.countDocuments({ teacher: teacherId }).exec(),
            session_1.default.find({ teacher: teacherId })
                .sort({ week: -1, number: -1, createdAt: -1 })
                .exec()
        ]);
        const centerNames = new Map(centers.map((center) => [String(center._id), center.name]));
        const byCenterCounts = new Map();
        const byGradeCounts = new Map();
        const lowBalanceStudents = students
            .filter((student) => (student.balance ?? 0) < (student.pricePerSession ?? 0))
            .sort((left, right) => left.balance - right.balance)
            .slice(0, 6)
            .map((student) => ({
            _id: String(student._id),
            firstName: student.firstName,
            lastName: student.lastName,
            userID: student.userID,
            phone: student.phone,
            balance: student.balance,
            centerName: student.center ? centerNames.get(String(student.center)) || "" : ""
        }));
        for (const student of students) {
            const centerName = student.center ? centerNames.get(String(student.center)) || "Unassigned" : "Unassigned";
            byCenterCounts.set(centerName, (byCenterCounts.get(centerName) || 0) + 1);
            const gradeValue = String(student.grade ?? "");
            const numericGrade = Number(gradeValue);
            const grade = ["S1", "S2", "S3"].includes(gradeValue)
                ? gradeValue
                : numericGrade === 0
                    ? "S1"
                    : numericGrade === 1
                        ? "S2"
                        : numericGrade === 2
                            ? "S3"
                            : "Unassigned";
            byGradeCounts.set(grade, (byGradeCounts.get(grade) || 0) + 1);
        }
        const latestSessions = sessions.slice(0, 8);
        const activeSession = sessions.find((session) => session.active);
        return {
            counts: {
                students: students.length,
                assistants,
                centers: centers.length,
                pendingRequests: 0,
                pendingTopups: 0,
                pendingSubmissions: 0,
                lowBalance: students.filter((student) => (student.balance ?? 0) < (student.pricePerSession ?? 0)).length,
                blocked: students.filter((student) => student.isBlocked).length
            },
            totalBalance: students.reduce((total, student) => total + (Number(student.balance) || 0), 0),
            activeSession: activeSession ? {
                _id: String(activeSession._id),
                sequence: activeSession.sequence,
                week: activeSession.week,
                number: activeSession.number,
                presentCount: activeSession.attendance.length
            } : null,
            todaySlots: [],
            attendanceTrend: latestSessions.reverse().map((session) => ({
                label: `#${session.number}`,
                value: session.attendance.length,
                sessionId: String(session._id)
            })),
            byCenter: [...byCenterCounts].map(([label, value]) => ({ label, value })),
            byGrade: [...byGradeCounts].map(([label, value]) => ({ label, value })),
            lowBalanceStudents,
            recent: []
        };
    }
    async getLeaderboard(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        });
        if (!teacher) {
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        }
        const enrollments = await this.enrollmentRepository.findall({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                status: "active",
                archived: false
            },
            populate: {
                path: "student",
                select: "_id firstName lastName userID phone profilepic"
            }
        });
        const rankedEnrollments = enrollments
            .filter((enrollment) => enrollment.student)
            .sort((left, right) => right.points - left.points);
        const centerIds = [...new Set(rankedEnrollments
                .map((enrollment) => enrollment.center ? String(enrollment.center) : "")
                .filter(Boolean))];
        const centers = centerIds.length
            ? await center_1.default.find({ _id: { $in: centerIds } }).select("_id name").lean().exec()
            : [];
        const centerNames = new Map(centers.map((center) => [String(center._id), center.name]));
        return rankedEnrollments.map((enrollment, index) => ({
            rank: index + 1,
            student: enrollment.student,
            points: enrollment.points,
            centerName: enrollment.center ? centerNames.get(String(enrollment.center)) ?? "" : ""
        }));
    }
    async getMyCenters(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "center"
        });
        if (!teacher)
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        const [requests, centers] = await Promise.all([
            this.requestRepository.findall({
                filter: {
                    teacher: new mongoose_1.Types.ObjectId(teacherId),
                    status: { $ne: "rejected" }
                },
                populate: {
                    path: "center",
                    select: "_id name phone localphone textlocation Maplocation"
                }
            }),
            this.centerRepository.findall({
                filter: { _id: { $in: teacher.center ?? [] } },
                select: "_id name phone localphone textlocation Maplocation"
            })
        ]);
        const requestCenterIds = new Set(requests.map((request) => String(typeof request.center === "object" && "name" in request.center ? request.center._id : request.center)));
        return [
            ...requests.filter((request) => request.center).map((request) => ({
                center: request.center,
                status: request.status === "accepted" ? "active" : "pending",
                requestedBy: request.requestedBy ?? "teacher",
                createdAt: request.createdAt
            })),
            ...centers
                .filter((center) => !requestCenterIds.has(String(center._id)))
                .map((center) => ({ center, status: "active", requestedBy: "teacher", createdAt: center.createdAt }))
        ];
    }
    async sendCenterRequest(centerID, teacherID) {
        if (!mongoose_1.Types.ObjectId.isValid(centerID)) {
            throw new error_exceptions_1.BadRequestError("Invalid center id");
        }
        if (!mongoose_1.Types.ObjectId.isValid(teacherID)) {
            throw new error_exceptions_1.BadRequestError("Invalid teacher id");
        }
        const centerData = await this.centerRepository.findById({ id: centerID });
        if (!centerData) {
            throw new error_exceptions_1.NotFoundError("Center not found");
        }
        const teacherData = await this.teacherRepository.findById({ id: teacherID, select: "center" });
        if (!teacherData) {
            throw new error_exceptions_1.NotFoundError("Teacher not found");
        }
        if (teacherData.center?.some((id) => String(id) === centerID)) {
            throw new error_exceptions_1.ConflictError("Teacher is already assigned to this center");
        }
        const existingRequest = await this.requestRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherID),
                center: new mongoose_1.Types.ObjectId(centerID)
            }
        });
        if (existingRequest?.status === "accepted") {
            throw new error_exceptions_1.ConflictError("Teacher is already assigned to this center");
        }
        if (existingRequest?.status === "pending") {
            throw new error_exceptions_1.ConflictError("A request to this center is already pending");
        }
        const request = existingRequest
            ? await this.requestRepository.findByIdAndUpdate({
                id: String(existingRequest._id),
                data: { $set: { status: "pending", requestedBy: "teacher", createdAt: new Date() } }
            })
            : await this.requestRepository.create({
                teacher: new mongoose_1.Types.ObjectId(teacherID),
                center: new mongoose_1.Types.ObjectId(centerID),
                status: "pending",
                requestedBy: "teacher"
            });
        if (!request)
            throw new error_exceptions_1.NotFoundError("Center request not found");
        return {
            id: String(request._id),
            teacher: String(request.teacher),
            center: String(request.center),
            status: request.status
        };
    }
    async answerCenterInvitation(teacherId, centerId, status) {
        if (!mongoose_1.Types.ObjectId.isValid(teacherId))
            throw new error_exceptions_1.BadRequestError("Invalid teacher id");
        if (!mongoose_1.Types.ObjectId.isValid(centerId))
            throw new error_exceptions_1.BadRequestError("Invalid center id");
        if (status !== "active" && status !== "rejected")
            throw new error_exceptions_1.BadRequestError("Status must be active or rejected");
        const request = await this.requestRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                center: new mongoose_1.Types.ObjectId(centerId)
            }
        });
        if (!request || request.status !== "pending" || request.requestedBy !== "center") {
            throw new error_exceptions_1.NotFoundError("Center invitation not found");
        }
        await this.requestRepository.findByIdAndUpdate({
            id: String(request._id),
            data: { $set: { status: status === "active" ? "accepted" : "rejected" } }
        });
        if (status === "active") {
            await this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $addToSet: { center: new mongoose_1.Types.ObjectId(centerId) } },
                select: "center"
            });
        }
        const center = await this.centerRepository.findById({
            id: centerId,
            select: "_id name phone localphone textlocation Maplocation"
        });
        if (!center)
            throw new error_exceptions_1.NotFoundError("Center not found");
        return { center, status, requestedBy: "center", createdAt: request.createdAt };
    }
    async leaveCenter(teacherId, centerId) {
        if (!mongoose_1.Types.ObjectId.isValid(teacherId))
            throw new error_exceptions_1.BadRequestError("Invalid teacher id");
        if (!mongoose_1.Types.ObjectId.isValid(centerId))
            throw new error_exceptions_1.BadRequestError("Invalid center id");
        const centerObjectId = new mongoose_1.Types.ObjectId(centerId);
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "center" });
        if (!teacher)
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        const request = await this.requestRepository.findone({
            filter: { teacher: new mongoose_1.Types.ObjectId(teacherId), center: centerObjectId }
        });
        const isLinked = teacher.center?.some((id) => String(id) === centerId);
        if (!isLinked && !request)
            throw new error_exceptions_1.NotFoundError("Center relationship not found");
        await Promise.all([
            this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $pull: { center: centerObjectId } },
                select: "center"
            }),
            this.requestRepository.deleteone({
                filter: { teacher: new mongoose_1.Types.ObjectId(teacherId), center: centerObjectId }
            })
        ]);
        return { id: centerId };
    }
    scheduleView(slot) {
        return {
            ...slot.toObject(),
            center: slot.center && typeof slot.center === "object" && "_id" in slot.center
                ? slot.center._id
                : slot.center ?? null,
            centerName: slot.center && typeof slot.center === "object" && "name" in slot.center
                ? slot.center.name
                : ""
        };
    }
    async getMySchedule(teacherId) {
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "_id" });
        if (!teacher)
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        const slots = await this.scheduleRepository.findall({
            filter: { teacher: new mongoose_1.Types.ObjectId(teacherId) },
            populate: { path: "center", select: "_id name" }
        });
        return slots.map((slot) => this.scheduleView(slot));
    }
    async assertScheduleCenter(teacherId, centerId) {
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "center" });
        if (!teacher)
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        if (!centerId)
            return null;
        if (!mongoose_1.Types.ObjectId.isValid(centerId))
            throw new error_exceptions_1.BadRequestError("Invalid center id");
        const center = await this.centerRepository.findById({ id: centerId, select: "_id" });
        if (!center)
            throw new error_exceptions_1.NotFoundError("Center not found");
        if (!teacher.center?.some((id) => String(id) === centerId)) {
            throw new error_exceptions_1.BadRequestError("Link your teacher account to this center before assigning a group");
        }
        return new mongoose_1.Types.ObjectId(centerId);
    }
    async createScheduleSlot(teacherId, data) {
        const center = await this.assertScheduleCenter(teacherId, data.center);
        const slot = await this.scheduleRepository.create({
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            center,
            title: data.title ?? "Group",
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            durationMinutes: data.durationMinutes ?? 90,
            grade: data.grade ?? "",
            notes: data.notes ?? "",
            isActive: data.isActive ?? true
        });
        return slot;
    }
    async updateScheduleSlot(teacherId, slotId, data) {
        if (!mongoose_1.Types.ObjectId.isValid(slotId))
            throw new error_exceptions_1.BadRequestError("Invalid schedule slot id");
        const slot = await this.scheduleRepository.findone({
            filter: { _id: new mongoose_1.Types.ObjectId(slotId), teacher: new mongoose_1.Types.ObjectId(teacherId) }
        });
        if (!slot)
            throw new error_exceptions_1.NotFoundError("Schedule slot not found");
        const center = data.center === undefined
            ? slot.center ?? null
            : await this.assertScheduleCenter(teacherId, data.center);
        const updated = await this.scheduleRepository.findByIdAndUpdate({
            id: slotId,
            data: {
                $set: {
                    ...data,
                    center,
                    ...(data.center === null ? { center: null } : {})
                }
            },
            populate: { path: "center", select: "_id name" }
        });
        if (!updated)
            throw new error_exceptions_1.NotFoundError("Schedule slot not found");
        return this.scheduleView(updated);
    }
    async deleteScheduleSlot(teacherId, slotId) {
        if (!mongoose_1.Types.ObjectId.isValid(slotId))
            throw new error_exceptions_1.BadRequestError("Invalid schedule slot id");
        const deleted = await this.scheduleRepository.deleteone({
            filter: { _id: new mongoose_1.Types.ObjectId(slotId), teacher: new mongoose_1.Types.ObjectId(teacherId) }
        });
        if (!deleted)
            throw new error_exceptions_1.NotFoundError("Schedule slot not found");
        return { id: slotId };
    }
    async startScheduledSession(teacherId, slotId, sequence) {
        if (!mongoose_1.Types.ObjectId.isValid(slotId))
            throw new error_exceptions_1.BadRequestError("Invalid schedule slot id");
        const slot = await this.scheduleRepository.findone({
            filter: { _id: new mongoose_1.Types.ObjectId(slotId), teacher: new mongoose_1.Types.ObjectId(teacherId), isActive: true }
        });
        if (!slot)
            throw new error_exceptions_1.NotFoundError("Active schedule slot not found");
        await this.assertScheduleCenter(teacherId, slot.center ? String(slot.center) : null);
        const now = new Date();
        const thursday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        const sessions = await this.sessionRepository.findall({
            filter: { teacher: new mongoose_1.Types.ObjectId(teacherId), week }
        });
        await this.sessionRepository.updateMany({
            filter: { teacher: new mongoose_1.Types.ObjectId(teacherId), active: true },
            data: { $set: { active: false } }
        });
        return this.sessionRepository.create({
            teacher: new mongoose_1.Types.ObjectId(teacherId),
            center: slot.center ?? null,
            schedule: new mongoose_1.Types.ObjectId(slotId),
            sequence,
            week,
            number: sessions.reduce((maximum, session) => Math.max(maximum, session.number), 0) + 1,
            date: now,
            status: "normal",
            active: true,
            attendance: []
        });
    }
    async getMyRequests(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "id"
        });
        if (!teacher)
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        const requests = await this.requestRepository.findall({
            filter: { teacher: new mongoose_1.Types.ObjectId(teacherId), status: 'pending', requestedBy: { $in: ["student"] } },
            populate: [
                { path: "student", select: "_id firstName lastName userID phone profilepic gender grade schoolName learningLanguage" }
            ]
        });
        return requests;
    }
    async getMyArchived(teacherId) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        });
        if (!teacher)
            throw new error_exceptions_1.NotFoundError("Teacher account not found");
        const enrollments = await this.enrollmentRepository.findall({
            filter: { teacher: new mongoose_1.Types.ObjectId(teacherId), archived: true },
            populate: {
                path: "student",
                select: "_id firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
            }
        });
        return enrollments
            .filter((enrollment) => enrollment.student)
            .map((enrollment) => ({
            student: enrollment.student,
            removedAt: enrollment.archivedAt ?? enrollment.updatedAt,
            reason: enrollment.removedReason ?? "",
            balance: enrollment.balance
        }));
    }
    async restoreArchivedStudent(teacherId, studentId) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new mongoose_1.Types.ObjectId(teacherId),
                student: new mongoose_1.Types.ObjectId(studentId),
                archived: true
            },
            select: "_id"
        });
        if (!enrollment) {
            throw new error_exceptions_1.NotFoundError("Archived student enrollment not found");
        }
        const restoredEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $set: { archived: false, archivedAt: null, removedReason: "" }
            },
            populate: {
                path: "student",
                select: "_id firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
            }
        });
        if (!restoredEnrollment) {
            throw new error_exceptions_1.NotFoundError("Archived student enrollment not found");
        }
        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $addToSet: { students: new mongoose_1.Types.ObjectId(studentId) } },
            select: "_id"
        });
        return {
            student: restoredEnrollment.student,
            status: restoredEnrollment.status,
            balance: restoredEnrollment.balance
        };
    }
    async requestHandling(teacherId, requestId, status) {
        if (!mongoose_1.Types.ObjectId.isValid(requestId))
            throw new error_exceptions_1.BadRequestError("Invalid request id");
        const request = await this.requestRepository.findone({
            filter: { _id: new mongoose_1.Types.ObjectId(requestId), teacher: new mongoose_1.Types.ObjectId(teacherId), requestedBy: { $in: ["student"] } }
        });
        if (!request)
            throw new error_exceptions_1.NotFoundError("Request not found");
        if (request.status !== "pending")
            throw new error_exceptions_1.BadRequestError("Request is not pending");
        const updated = await this.requestRepository.findByIdAndUpdate({
            id: requestId,
            data: { $set: { status } },
            select: "status"
        });
        if (status === "accepted") {
            try {
                await this.teacherRepository.findByIdAndUpdate({
                    id: teacherId,
                    data: { $push: { students: request.student } },
                    select: "id"
                });
                await this.enrollmentRepository.create({
                    teacher: new mongoose_1.Types.ObjectId(teacherId),
                    student: new mongoose_1.Types.ObjectId(request.student),
                    status: "active",
                    points: 0
                });
            }
            catch (error) {
                throw new error_exceptions_1.BadRequestError("Failed to add student to teacher's list");
            }
        }
        return updated;
    }
    async getTeacherData(teacherID) {
        return await this.teacherRepository.findById({
            id: teacherID,
            select: "-password -createdAt -updatedAt -__v",
        });
    }
}
exports.TeacherService = TeacherService;
const teacherService = new TeacherService();
exports.default = teacherService;
