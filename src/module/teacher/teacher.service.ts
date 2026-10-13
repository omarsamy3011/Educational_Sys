import { ITeacher } from "../../common/interface/teacher"
import { IStudent } from "../../common/interface/stud"
import { IAssistant } from "../../common/interface/assis"
import { BadRequestError, ConflictError, NotFoundError } from "../../common/exceptions/error.exceptions"
import teacherModel from "../../db/model/teacher"
import studentModel from "../../db/model/student"
import assistantModel from "../../db/model/assistant"
import centerModel from "../../db/model/center"
import sessionModel from "../../db/model/session"
import requestModel from "../../db/model/request"
import { DatabaseReposatory } from "../../db/repository/db.repo"
import { genertateHash } from "../../common/security/security"
import crypto from "node:crypto"
import { Types } from "mongoose"
import { ICenter } from "../../common/interface/center"
import { IRequest } from "../../common/interface/request"
import { ISchedule } from "../../common/interface/schedule"
import { ISession } from "../../common/interface/session"
import scheduleModel from "../../db/model/schedule"
import { EnrollmentPointEntry, EnrollmentTransactionEntry, EnrollmentWarningEntry, IEnrollment } from "../../common/interface/enrollment"
import enrollmentModel from "../../db/model/enrollment"
import counterModel from "../../db/model/counter"
import { createTeacherStudentSchema } from "./teacher.validation"

type TeacherProfileUpdate = {
    firstName?: string | undefined
    lastName?: string | undefined
    profilepic?: string | undefined
    bio?: string | undefined
    gender?: string | undefined
    companyName?: string | undefined
    subject?: string[] | undefined
    teachingLanguage?: string | undefined
}

type NewTeacherAssistant = {
    userName: string
    email: string
    phone: string
    password: string
    firstName?: string | undefined
    lastName?: string | undefined
    role?: 'Admin' | 'Assistant' | undefined
    permissions?: string[] | undefined
}

type ScheduleSlotData = {
    title?: string | undefined
    dayOfWeek?: number | undefined
    startTime?: string | undefined
    durationMinutes?: number | undefined
    center?: string | null | undefined
    grade?: string | undefined
    notes?: string | undefined
    isActive?: boolean | undefined
}

type LinkExistingStudentData = {
    identifier: string
    center?: string | null | undefined
    pricePerSession?: number | null | undefined
}

type NewTeacherStudentData = {
    firstName: string
    lastName?: string | undefined
    phone: string
    parentPhone: string
    grade: string
    gender?: string | undefined
    schoolName: string
    learningLanguage: string
    center?: string | null | undefined
    pricePerSession?: number | null | undefined
    balance?: number | null | undefined
}

type TeacherStudentImportRow = Record<string, unknown>

type TeacherRequestWithCenter = IRequest & {
    _id: Types.ObjectId
    center: (ICenter & { _id: Types.ObjectId }) | Types.ObjectId
}
type CenterDocument = ICenter & { _id: Types.ObjectId; createdAt?: Date }
type ScheduleDocument = ISchedule & {
    _id: Types.ObjectId
    center?: Types.ObjectId | { _id: Types.ObjectId; name: string } | null
    toObject: () => Record<string, unknown>
}

export class TeacherService {
    private teacherRepository : DatabaseReposatory<ITeacher>
    private studentRepository : DatabaseReposatory<IStudent>
    private assistantRepository : DatabaseReposatory<IAssistant>
    private centerRepository :  DatabaseReposatory<ICenter>
    private requestRepository : DatabaseReposatory<IRequest>
    private scheduleRepository : DatabaseReposatory<ISchedule>
    private sessionRepository : DatabaseReposatory<ISession>
    private enrollmentRepository : DatabaseReposatory<IEnrollment>
    constructor(){
        this.teacherRepository = new DatabaseReposatory<ITeacher>(teacherModel)
        this.studentRepository = new DatabaseReposatory<IStudent>(studentModel)
        this.assistantRepository = new DatabaseReposatory<IAssistant>(assistantModel)
        this.centerRepository = new DatabaseReposatory<ICenter>(centerModel)
        this.requestRepository = new DatabaseReposatory<IRequest>(requestModel)
        this.scheduleRepository = new DatabaseReposatory<ISchedule>(scheduleModel)
        this.sessionRepository = new DatabaseReposatory<ISession>(sessionModel)
        this.enrollmentRepository = new DatabaseReposatory<IEnrollment>(enrollmentModel)
    }

    async getMyProfile(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "-password -__v"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }
        return teacher
    }

    async searchTeachers(query?: string) {
        const normalizedQuery = query?.trim()
        const terms = normalizedQuery
            ? normalizedQuery.split(/\s+/).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            : []
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
        })
        return teachers
    }

    async updateMyProfile(teacherId: string, data: TeacherProfileUpdate) {
        if (data.companyName) {
            const existingTeacher = await this.teacherRepository.findone({
                filter: {
                    companyName: data.companyName,
                    _id: { $ne: teacherId }
                }
            })
            if (existingTeacher) {
                throw new ConflictError("Company name already taken")
            }
        }

        const result = await this.teacherRepository.updateone({
            filter: { _id: teacherId },
            data: { $set: data }
        })
        if (result.matchedCount === 0) {
            throw new NotFoundError("Teacher account not found")
        }
        return this.getMyProfile(teacherId)
    }

    async deleteMyProfile(teacherId: string) {
        const teacher = await this.teacherRepository.deleteById(teacherId)
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }
        return { id: teacherId }
    }

    async getMyStudents(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id:teacherId,
            populate:[{
                path: "students",
                select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
            }],
            select:'students'
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }
        return teacher.students
    }

    async getMyStudent(teacherId: string, studentId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }
        const isAssigned = teacher.students.some((id: unknown) => String(id) === studentId)
        if (!isAssigned) {
            throw new NotFoundError("Student not found")
        }

        const [student, enrollment] = await Promise.all([
            this.studentRepository.findById({
                id: studentId,
                select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage balance pricePerSession isBlocked center"
            }),
            this.enrollmentRepository.findone({
                filter: {
                    teacher: new Types.ObjectId(teacherId),
                    student: new Types.ObjectId(studentId),
                    status: "active",
                    archived: false
                }
            })
        ])
        if (!student) {
            throw new NotFoundError("Student not found")
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
        }
    }

    async getStudentHistory(teacherId: string, studentId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(studentId)
            },
            select: "_id pointsHistory transactionHistory warnings"
        })
        const isAssigned = teacher.students.some((id: unknown) => String(id) === studentId)
        if (!isAssigned && !enrollment) {
            throw new NotFoundError("Student not found")
        }

        const sessions = await sessionModel.find({
            teacher: new Types.ObjectId(teacherId)
        }).sort({ date: -1, createdAt: -1 }).lean().exec()

        const attendance = sessions.map((session) => {
            const row = session.attendance.find((item) => String(item.student) === studentId)
            const status = session.status === "cancelled"
                ? "cancelled"
                : row
                    ? "present"
                    : session.active
                        ? "pending"
                        : "absent"

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
            }
        })

        const counted = attendance.filter((row) => row.status === "present" || row.status === "absent")
        const present = counted.filter((row) => row.status === "present").length

        return {
            attendance,
            exams: [],
            homework: [],
            warnings: (enrollment?.warnings ?? [])
                .slice()
                .sort((left: EnrollmentWarningEntry, right: EnrollmentWarningEntry) => right.createdAt.getTime() - left.createdAt.getTime())
                .map((warning: EnrollmentWarningEntry) => ({
                    _id: warning._id ? String(warning._id) : undefined,
                    reason: warning.reason,
                    createdAt: warning.createdAt,
                    byName: "Teacher"
                })),
            points: (enrollment?.pointsHistory ?? [])
                .slice()
                .sort((left: EnrollmentPointEntry, right: EnrollmentPointEntry) => right.createdAt.getTime() - left.createdAt.getTime())
                .map((entry: EnrollmentPointEntry) => ({
                    points: entry.points,
                    reason: entry.reason,
                    createdAt: entry.createdAt,
                    byName: "Teacher"
                })),
            transactions: (enrollment?.transactionHistory ?? [])
                .slice()
                .sort((left: EnrollmentTransactionEntry, right: EnrollmentTransactionEntry) => right.createdAt.getTime() - left.createdAt.getTime())
                .map((entry: EnrollmentTransactionEntry) => ({
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
        }
    }

    async getScanLookup(teacherId: string, identifier: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        const normalizedIdentifier = identifier.trim()
        const idFilter = Types.ObjectId.isValid(normalizedIdentifier)
            ? [{ _id: normalizedIdentifier }, { userID: normalizedIdentifier }, { phone: normalizedIdentifier }]
            : [{ userID: normalizedIdentifier }, { phone: normalizedIdentifier }]
        const student = await this.studentRepository.findone({
            filter: {
                _id: { $in: teacher.students },
                $or: idFilter
            },
            select: "_id userID firstName lastName phone profilepic gender grade schoolName learningLanguage balance pricePerSession isBlocked center"
        })
        if (!student) {
            throw new NotFoundError("No student in your class matches that code")
        }

        const [enrollment, activeSession, sessions] = await Promise.all([
            this.enrollmentRepository.findone({
                filter: {
                    teacher: new Types.ObjectId(teacherId),
                    student: new Types.ObjectId(String(student._id)),
                    status: "active",
                    archived: false
                },
                select: "balance points isBlocked pricePerSession center adminNote followUpAssistant warnings"
            }),
            sessionModel.findOne({
                teacher: new Types.ObjectId(teacherId),
                active: true
            }).exec(),
            sessionModel.find({
                teacher: new Types.ObjectId(teacherId)
            }).sort({ date: -1, createdAt: -1 }).limit(5).exec()
        ])

        const balance = enrollment?.balance ?? student.balance ?? 0
        const price = enrollment?.pricePerSession ?? student.pricePerSession ?? 0
        const isBlocked = enrollment?.isBlocked ?? student.isBlocked ?? false
        const activeAttendance = activeSession?.attendance.find(
            (row) => String(row.student) === String(student._id)
        )
        const warnings = enrollment?.warnings ?? []
        const reasons: string[] = []
        if (isBlocked) reasons.push("Student is blocked")
        if (warnings.length >= 3) reasons.push(`${warnings.length} warnings`)
        if (!activeAttendance && balance < price) {
            reasons.push(`Balance ${balance} is less than the session price ${price}`)
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
        ])

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
            warnings: warnings.map((warning: EnrollmentWarningEntry) => ({
                _id: warning._id ? String(warning._id) : undefined,
                reason: warning.reason,
                createdAt: warning.createdAt
            })),
            booklets: [],
            lastSessions: sessions
                .filter((session) => !activeSession || String(session._id) !== String(activeSession._id))
                .slice(0, 4)
                .map((session) => {
                    const row = session.attendance.find(
                        (entry) => String(entry.student) === String(student._id)
                    )
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
                    }
                })
        }
    }

    async adjustStudentPoints(teacherId: string, studentId: string, points: number, reason = "") {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        })
        if (!enrollment) {
            throw new NotFoundError("Active student enrollment not found")
        }

        const updatedEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $inc: { points },
                $push: {
                    pointsHistory: {
                        points,
                        reason: reason.trim(),
                        by: new Types.ObjectId(teacherId),
                        createdAt: new Date()
                    }
                }
            },
            select: "points pointsHistory"
        })
        if (!updatedEnrollment) {
            throw new NotFoundError("Active student enrollment not found")
        }
        return {
            points: updatedEnrollment.points,
            entry: updatedEnrollment.pointsHistory?.at(-1)
        }
    }

    async adjustStudentBalance(teacherId: string, studentId: string, amount: number, reason: string) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        })
        if (!enrollment) {
            throw new NotFoundError("Active student enrollment not found")
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
                        by: new Types.ObjectId(teacherId),
                        createdAt: new Date()
                    }
                },
            },
            select: "balance transactionHistory"
        })
        if (!updatedEnrollment) {
            throw new NotFoundError("Active student enrollment not found")
        }
        return {
            balance: updatedEnrollment.balance,
            transaction: updatedEnrollment.transactionHistory?.at(-1)
        }
    }

    async addStudentWarning(teacherId: string, studentId: string, reason: string) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        })
        if (!enrollment) {
            throw new NotFoundError("Active student enrollment not found")
        }

        const updatedEnrollment = await this.enrollmentRepository.findByIdAndUpdate({
            id: String(enrollment._id),
            data: {
                $push: {
                    warnings: {
                        reason: reason.trim(),
                        by: new Types.ObjectId(teacherId),
                        createdAt: new Date()
                    }
                }
            },
            select: "warnings isBlocked"
        })
        if (!updatedEnrollment) {
            throw new NotFoundError("Active student enrollment not found")
        }

        const shouldBlock = (updatedEnrollment.warnings?.length ?? 0) >= 3
        if (shouldBlock && !updatedEnrollment.isBlocked) {
            await this.enrollmentRepository.findByIdAndUpdate({
                id: String(enrollment._id),
                data: { $set: { isBlocked: true } },
                select: "isBlocked"
            })
        }

        return {
            warning: updatedEnrollment.warnings?.at(-1),
            warningCount: updatedEnrollment.warnings?.length ?? 0,
            isBlocked: shouldBlock || updatedEnrollment.isBlocked
        }
    }

    async updateMyStudent(teacherId: string, studentId: string,data:object) {
        const teacher = await this.teacherRepository.findone({
            filter: { _id: teacherId ,
                students: {$in :[studentId]}
            },
        select:'id'})        
        if (!teacher) {
            throw new NotFoundError("Teacher Is not Teaching This Student")
        }
        const updatedStudent = await this.studentRepository.findByIdAndUpdate({
            id: studentId,
            data: data,
            select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage parentPhone balance"
        })
        if (!updatedStudent) {
            throw new NotFoundError("Student not found")
        }
        return updatedStudent
    }

    async archiveStudent(teacherId: string, studentId: string, reason: string) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(studentId),
                status: "active",
                archived: false
            },
            select: "_id"
        })
        if (!enrollment) {
            throw new NotFoundError("Student enrollment not found")
        }

        const archivedAt = new Date()
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
        })
        if (!archivedEnrollment) {
            throw new NotFoundError("Student enrollment not found")
        }

        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $pull: { students: new Types.ObjectId(studentId) } },
            select: "_id"
        })

        return {
            student: archivedEnrollment.student,
            removedAt: archivedEnrollment.archivedAt,
            reason: archivedEnrollment.removedReason,
            balance: archivedEnrollment.balance
        }
    }

    async importStudents(teacherId: string, rows: TeacherStudentImportRow[]) {
        const created: { name: string; userID: string; password: string }[] = []
        const skipped: { row: TeacherStudentImportRow; reason: string }[] = []

        for (const row of rows) {
            if (!String(row.grade ?? "").trim()) {
                skipped.push({ row, reason: "Grade is required" })
                continue
            }
            if (!String(row.learningLanguage ?? "").trim()) {
                skipped.push({ row, reason: "Learning language is required" })
                continue
            }

            const parsed = createTeacherStudentSchema.safeParse(row)
            if (!parsed.success) {
                skipped.push({
                    row,
                    reason: parsed.error.issues[0]?.message ?? "Invalid student data"
                })
                continue
            }

            try {
                const result = await this.createStudent(teacherId, parsed.data)
                created.push({
                    name: [result.student.firstName, result.student.lastName].filter(Boolean).join(" "),
                    userID: result.userID,
                    password: result.password
                })
            } catch (error) {
                if (error instanceof ConflictError || error instanceof BadRequestError || error instanceof NotFoundError) {
                    skipped.push({
                        row,
                        reason: error.message
                    })
                    continue
                }
                throw error
            }
        }

        return { created, skipped }
    }

    async linkStudent(teacherId: string, data: LinkExistingStudentData) {
        const identifier = data.identifier.trim()
        const student = await this.studentRepository.findone({
            filter: {
                $or: [{ userID: identifier }, { phone: identifier }]
            },
            select: "_id userID firstName lastName phone parentPhone profilepic gender grade schoolName learningLanguage"
        })
        if (!student) {
            throw new NotFoundError("No student account matches that code or phone number")
        }

        const existingEnrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(String(student._id))
            },
            select: "_id archived"
        })
        if (existingEnrollment) {
            throw new ConflictError(
                existingEnrollment.archived
                    ? "This student was previously in your class; restore them from the Removed tab"
                    : "This student is already linked to your class"
            )
        }

        let center: Types.ObjectId | null = null
        if (data.center) {
            if (!Types.ObjectId.isValid(data.center)) {
                throw new BadRequestError("Invalid center id")
            }
            center = new Types.ObjectId(data.center)
            const teacher = await this.teacherRepository.findone({
                filter: { _id: teacherId, center: center },
                select: "_id"
            })
            if (!teacher) {
                throw new BadRequestError("The selected center is not linked to your account")
            }
        }

        const enrollment = await this.enrollmentRepository.create({
            teacher: new Types.ObjectId(teacherId),
            student: new Types.ObjectId(String(student._id)),
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
        })

        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $addToSet: { students: new Types.ObjectId(String(student._id)) } },
            select: "_id"
        })

        return {
            ...student.toObject(),
            enrollmentId: String(enrollment._id),
            status: enrollment.status,
            balance: enrollment.balance,
            points: enrollment.points,
            pricePerSession: enrollment.pricePerSession,
            center: enrollment.center,
            joinedAt: enrollment.joinedAt
        }
    }

    async createStudent(teacherId: string, data: NewTeacherStudentData) {
        const existingStudent = await this.studentRepository.findone({
            filter: { phone: data.phone },
            select: "_id"
        })
        if (existingStudent) {
            throw new ConflictError("Phone number already registered")
        }

        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id center"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        let center: Types.ObjectId | null = null
        if (data.center) {
            if (!Types.ObjectId.isValid(data.center)) {
                throw new BadRequestError("Invalid center id")
            }
            center = new Types.ObjectId(data.center)
            if (!(teacher.center ?? []).some((centerId: Types.ObjectId) => String(centerId) === String(center))) {
                throw new BadRequestError("The selected center is not linked to your account")
            }
        }

        let userID: string
        do {
            const counter = await counterModel.findByIdAndUpdate(
                "studentUserID",
                { $inc: { sequence: 1 } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            ).exec()
            if (!counter) {
                throw new Error("Unable to generate a student ID.")
            }
            userID = `STU-${String(counter.sequence).padStart(6, "0")}`
        } while (await studentModel.exists({ userID }))

        const password = crypto.randomBytes(12).toString("base64url")
        const balance = data.balance ?? 0
        const pricePerSession = data.pricePerSession ?? 0
        const student = await this.studentRepository.create({
            userID,
            password: await genertateHash({ plainText: password }),
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
        })

        const enrollment = await this.enrollmentRepository.create({
            teacher: new Types.ObjectId(teacherId),
            student: new Types.ObjectId(String(student._id)),
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
        })

        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $addToSet: { students: new Types.ObjectId(String(student._id)) } },
            select: "_id"
        })

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
        }
    }

    async addAssistant(teacherId: string, data: NewTeacherAssistant) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        const existingAssistant = await this.assistantRepository.findone({
            filter: {
                $or: [
                    { email: data.email },
                    { userName: data.userName },
                    { phone: data.phone }
                ]
            }
        })
        if (existingAssistant) {
            if (existingAssistant.email === data.email) {
                throw new ConflictError("Email already registered")
            }
            if (existingAssistant.userName === data.userName) {
                throw new ConflictError("Username already taken")
            }
            if (existingAssistant.phone === data.phone) {
                throw new ConflictError("Phone number already registered")
            }
        }

        const assistantData: IAssistant = {
            userName: data.userName,
            email: data.email,
            phone: data.phone,
            password: await genertateHash({ plainText: data.password }),
            teacher: new Types.ObjectId(teacherId),
            createdAt: new Date(),
            ...(data.firstName === undefined ? {} : { firstName: data.firstName }),
            ...(data.lastName === undefined ? {} : { lastName: data.lastName }),
            ...(data.role === undefined ? {} : { role: data.role }),
            ...(data.permissions === undefined ? {} : { permissions: data.permissions })
        }
        const assistant = await this.assistantRepository.create(assistantData)

        return {
            id: String(assistant._id),
            userName: assistant.userName,
            email: assistant.email,
            phone: assistant.phone,
            firstName: assistant.firstName,
            lastName: assistant.lastName,
            role: assistant.role,
            teacher: String(assistant.teacher)
        }
    }

    async getMyAssistants(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            populate: [{
                path: "assistants",
                select: "userName email phone firstName lastName"
            }],
            select: "assistants"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }
        return teacher.assistants
    }

    async getDashboardData(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students center"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        const [students, centers, assistants, sessions] = await Promise.all([
            studentModel.find({ _id: { $in: teacher.students } })
                .select("firstName lastName userID phone balance pricePerSession isBlocked center grade")
                .exec(),
            centerModel.find({ _id: { $in: teacher.center } })
                .select("name")
                .exec(),
            assistantModel.countDocuments({ teacher: teacherId }).exec(),
            sessionModel.find({ teacher: teacherId })
                .sort({ week: -1, number: -1, createdAt: -1 })
                .exec()
        ])

        const centerNames = new Map(centers.map((center) => [String(center._id), center.name]))
        const byCenterCounts = new Map<string, number>()
        const byGradeCounts = new Map<string, number>()
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
            }))

        for (const student of students) {
            const centerName = student.center ? centerNames.get(String(student.center)) || "Unassigned" : "Unassigned"
            byCenterCounts.set(centerName, (byCenterCounts.get(centerName) || 0) + 1)

            const gradeValue = String(student.grade ?? "")
            const numericGrade = Number(gradeValue)
            const grade = ["S1", "S2", "S3"].includes(gradeValue)
                ? gradeValue
                : numericGrade === 0
                    ? "S1"
                    : numericGrade === 1
                        ? "S2"
                        : numericGrade === 2
                            ? "S3"
                            : "Unassigned"
            byGradeCounts.set(grade, (byGradeCounts.get(grade) || 0) + 1)
        }

        const latestSessions = sessions.slice(0, 8)
        const activeSession = sessions.find((session) => session.active)

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
        }
    }

    async getLeaderboard(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        const enrollments = await this.enrollmentRepository.findall({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                status: "active",
                archived: false
            },
            populate: {
                path: "student",
                select: "_id firstName lastName userID phone profilepic"
            }
        })
        const rankedEnrollments = enrollments
            .filter((enrollment: IEnrollment) => enrollment.student)
            .sort((left: IEnrollment, right: IEnrollment) => right.points - left.points)

        const centerIds = [...new Set(rankedEnrollments
            .map((enrollment: IEnrollment) => enrollment.center ? String(enrollment.center) : "")
            .filter(Boolean))]
        const centers = centerIds.length
            ? await centerModel.find({ _id: { $in: centerIds } }).select("_id name").lean().exec()
            : []
        const centerNames = new Map(centers.map((center) => [String(center._id), center.name]))

        return rankedEnrollments.map((enrollment: IEnrollment, index: number) => ({
            rank: index + 1,
            student: enrollment.student,
            points: enrollment.points,
            centerName: enrollment.center ? centerNames.get(String(enrollment.center)) ?? "" : ""
        }))
    }

    async getMyCenters(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "center"
        })
        if (!teacher) throw new NotFoundError("Teacher account not found")

        const [requests, centers] = await Promise.all([
            this.requestRepository.findall({
                filter: {
                    teacher: new Types.ObjectId(teacherId),
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
        ]) as [TeacherRequestWithCenter[], CenterDocument[]]
        const requestCenterIds = new Set(requests.map((request) => String(
            typeof request.center === "object" && "name" in request.center ? request.center._id : request.center
        )))
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
        ]
    }

    async sendCenterRequest(centerID: string, teacherID: string) {
        if (!Types.ObjectId.isValid(centerID)) {
            throw new BadRequestError("Invalid center id")
        }
        if (!Types.ObjectId.isValid(teacherID)) {
            throw new BadRequestError("Invalid teacher id")
        }

        const centerData = await this.centerRepository.findById({ id: centerID })
        if (!centerData) {
            throw new NotFoundError("Center not found")
        }

        const teacherData = await this.teacherRepository.findById({ id: teacherID, select: "center" })
        if (!teacherData) {
            throw new NotFoundError("Teacher not found")
        }

        if (teacherData.center?.some((id: unknown) => String(id) === centerID)) {
            throw new ConflictError("Teacher is already assigned to this center")
        }

        const existingRequest = await this.requestRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherID),
                center: new Types.ObjectId(centerID)
            }
        })

        if (existingRequest?.status === "accepted") {
            throw new ConflictError("Teacher is already assigned to this center")
        }
        if (existingRequest?.status === "pending") {
            throw new ConflictError("A request to this center is already pending")
        }

        const request = existingRequest
            ? await this.requestRepository.findByIdAndUpdate({
                id: String(existingRequest._id),
                data: { $set: { status: "pending", requestedBy: "teacher", createdAt: new Date() } }
            })
            : await this.requestRepository.create({
                teacher: new Types.ObjectId(teacherID),
                center: new Types.ObjectId(centerID),
                status: "pending",
                requestedBy: "teacher"
            } as IRequest)
        if (!request) throw new NotFoundError("Center request not found")

        return {
            id: String(request._id),
            teacher: String(request.teacher),
            center: String(request.center),
            status: request.status
        }
    }

    async answerCenterInvitation(teacherId: string, centerId: string, status: "active" | "rejected") {
        if (!Types.ObjectId.isValid(teacherId)) throw new BadRequestError("Invalid teacher id")
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        if (status !== "active" && status !== "rejected") throw new BadRequestError("Status must be active or rejected")

        const request = await this.requestRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                center: new Types.ObjectId(centerId)
            }
        })
        if (!request || request.status !== "pending" || request.requestedBy !== "center") {
            throw new NotFoundError("Center invitation not found")
        }

        await this.requestRepository.findByIdAndUpdate({
            id: String(request._id),
            data: { $set: { status: status === "active" ? "accepted" : "rejected" } }
        })
        if (status === "active") {
            await this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $addToSet: { center: new Types.ObjectId(centerId) } },
                select: "center"
            })
        }
        const center = await this.centerRepository.findById({
            id: centerId,
            select: "_id name phone localphone textlocation Maplocation"
        })
        if (!center) throw new NotFoundError("Center not found")
        return { center, status, requestedBy: "center", createdAt: request.createdAt }
    }

    async leaveCenter(teacherId: string, centerId: string) {
        if (!Types.ObjectId.isValid(teacherId)) throw new BadRequestError("Invalid teacher id")
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const centerObjectId = new Types.ObjectId(centerId)
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "center" })
        if (!teacher) throw new NotFoundError("Teacher account not found")
        const request = await this.requestRepository.findone({
            filter: { teacher: new Types.ObjectId(teacherId), center: centerObjectId }
        })
        const isLinked = teacher.center?.some((id: unknown) => String(id) === centerId)
        if (!isLinked && !request) throw new NotFoundError("Center relationship not found")

        await Promise.all([
            this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $pull: { center: centerObjectId } },
                select: "center"
            }),
            this.requestRepository.deleteone({
                filter: { teacher: new Types.ObjectId(teacherId), center: centerObjectId }
            })
        ])
        return { id: centerId }
    }

    private scheduleView(slot: ScheduleDocument) {
        return {
            ...slot.toObject(),
            center: slot.center && typeof slot.center === "object" && "_id" in slot.center
                ? slot.center._id
                : slot.center ?? null,
            centerName: slot.center && typeof slot.center === "object" && "name" in slot.center
                ? slot.center.name
                : ""
        }
    }

    async getMySchedule(teacherId: string) {
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "_id" })
        if (!teacher) throw new NotFoundError("Teacher account not found")
        const slots = await this.scheduleRepository.findall({
            filter: { teacher: new Types.ObjectId(teacherId) },
            populate: { path: "center", select: "_id name" }
        }) as ScheduleDocument[]
        return slots.map((slot) => this.scheduleView(slot))
    }

    private async assertScheduleCenter(teacherId: string, centerId?: string | null) {
        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "center" })
        if (!teacher) throw new NotFoundError("Teacher account not found")
        if (!centerId) return null
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const center = await this.centerRepository.findById({ id: centerId, select: "_id" })
        if (!center) throw new NotFoundError("Center not found")
        if (!teacher.center?.some((id: unknown) => String(id) === centerId)) {
            throw new BadRequestError("Link your teacher account to this center before assigning a group")
        }
        return new Types.ObjectId(centerId)
    }

    async createScheduleSlot(teacherId: string, data: ScheduleSlotData) {
        const center = await this.assertScheduleCenter(teacherId, data.center)
        const slot = await this.scheduleRepository.create({
            teacher: new Types.ObjectId(teacherId),
            center,
            title: data.title ?? "Group",
            dayOfWeek: data.dayOfWeek!,
            startTime: data.startTime!,
            durationMinutes: data.durationMinutes ?? 90,
            grade: data.grade ?? "",
            notes: data.notes ?? "",
            isActive: data.isActive ?? true
        } as ISchedule)
        return slot
    }

    async updateScheduleSlot(teacherId: string, slotId: string, data: ScheduleSlotData) {
        if (!Types.ObjectId.isValid(slotId)) throw new BadRequestError("Invalid schedule slot id")
        const slot = await this.scheduleRepository.findone({
            filter: { _id: new Types.ObjectId(slotId), teacher: new Types.ObjectId(teacherId) }
        })
        if (!slot) throw new NotFoundError("Schedule slot not found")
        const center = data.center === undefined
            ? slot.center ?? null
            : await this.assertScheduleCenter(teacherId, data.center)
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
        })
        if (!updated) throw new NotFoundError("Schedule slot not found")
        return this.scheduleView(updated)
    }

    async deleteScheduleSlot(teacherId: string, slotId: string) {
        if (!Types.ObjectId.isValid(slotId)) throw new BadRequestError("Invalid schedule slot id")
        const deleted = await this.scheduleRepository.deleteone({
            filter: { _id: new Types.ObjectId(slotId), teacher: new Types.ObjectId(teacherId) }
        })
        if (!deleted) throw new NotFoundError("Schedule slot not found")
        return { id: slotId }
    }

    async startScheduledSession(teacherId: string, slotId: string, sequence: string) {
        if (!Types.ObjectId.isValid(slotId)) throw new BadRequestError("Invalid schedule slot id")
        const slot = await this.scheduleRepository.findone({
            filter: { _id: new Types.ObjectId(slotId), teacher: new Types.ObjectId(teacherId), isActive: true }
        })
        if (!slot) throw new NotFoundError("Active schedule slot not found")
        await this.assertScheduleCenter(teacherId, slot.center ? String(slot.center) : null)

        const now = new Date()
        const thursday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
        thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
        const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        const sessions = await this.sessionRepository.findall({
            filter: { teacher: new Types.ObjectId(teacherId), week }
        }) as ISession[]
        await this.sessionRepository.updateMany({
            filter: { teacher: new Types.ObjectId(teacherId), active: true },
            data: { $set: { active: false } }
        })
        return this.sessionRepository.create({
            teacher: new Types.ObjectId(teacherId),
            center: slot.center ?? null,
            schedule: new Types.ObjectId(slotId),
            sequence,
            week,
            number: sessions.reduce((maximum, session) => Math.max(maximum, session.number), 0) + 1,
            date: now,
            status: "normal",
            active: true,
            attendance: []
        } as ISession)
    }

    async getMyRequests(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select:"id"
        })
        if (!teacher) throw new NotFoundError("Teacher account not found")
        const requests = await this.requestRepository.findall({
            filter: { teacher: new Types.ObjectId(teacherId) , status: 'pending' , requestedBy: { $in: [ "student"] } },
            populate: [
                {path: "student", select: "_id firstName lastName userID phone profilepic gender grade schoolName learningLanguage"}
            ]
        })
        return requests
    }

    async getMyArchived(teacherId: string) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        })
        if (!teacher) throw new NotFoundError("Teacher account not found")
        const enrollments = await this.enrollmentRepository.findall({
            filter: { teacher: new Types.ObjectId(teacherId), archived: true },
            populate: {
                path: "student",
                select: "_id firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
            }
        })

        return enrollments
            .filter((enrollment: IEnrollment) => enrollment.student)
            .map((enrollment: IEnrollment) => ({
                student: enrollment.student,
                removedAt: enrollment.archivedAt ?? enrollment.updatedAt,
                reason: enrollment.removedReason ?? "",
                balance: enrollment.balance
            }))
    }

    async restoreArchivedStudent(teacherId: string, studentId: string) {
        const enrollment = await this.enrollmentRepository.findone({
            filter: {
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(studentId),
                archived: true
            },
            select: "_id"
        })
        if (!enrollment) {
            throw new NotFoundError("Archived student enrollment not found")
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
        })

        if (!restoredEnrollment) {
            throw new NotFoundError("Archived student enrollment not found")
        }

        await this.teacherRepository.findByIdAndUpdate({
            id: teacherId,
            data: { $addToSet: { students: new Types.ObjectId(studentId) } },
            select: "_id"
        })

        return {
            student: restoredEnrollment.student,
            status: restoredEnrollment.status,
            balance: restoredEnrollment.balance
        }
    }

    async requestHandling(teacherId: string, requestId: string, status: "accepted" | "rejected") {
        if (!Types.ObjectId.isValid(requestId)) throw new BadRequestError("Invalid request id")
        const request = await this.requestRepository.findone({
            filter: { _id: new Types.ObjectId(requestId), teacher: new Types.ObjectId(teacherId) , requestedBy: { $in: [ "student"] } }
        })
        if (!request) throw new NotFoundError("Request not found")
        if(request.status !== "pending") throw new BadRequestError("Request is not pending")
        const updated = await this.requestRepository.findByIdAndUpdate({
            id: requestId,
            data: { $set: { status } },
            select:"status"
        })
        if(status === "accepted") {
        try {
            await this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $push: { students: request.student } },
                select:"id"})
            await this.enrollmentRepository.create({
                teacher: new Types.ObjectId(teacherId),
                student: new Types.ObjectId(request.student),
                status: "active",
                points:0
            })
        } catch (error) {
            throw new BadRequestError("Failed to add student to teacher's list")
        }
    }
        return updated
    }

    async getTeacherData (teacherID:string){
        return await this.teacherRepository.findById({
            id: teacherID,
            select: "-password -createdAt -updatedAt -__v",
        })
    }
}

const teacherService = new TeacherService()
export default teacherService