import { ConflictError, NotFoundError } from "../../common/exceptions/error.exceptions"
import { ISession, ISessionAttendance } from "../../common/interface/session"
import { IStudent } from "../../common/interface/stud"
import { ITeacher } from "../../common/interface/teacher"
import sessionModel from "../../db/model/session"
import studentModel from "../../db/model/student"
import teacherModel from "../../db/model/teacher"
import { DatabaseReposatory } from "../../db/repository/db.repo"
import { Types } from "mongoose"

type NewSession = Pick<ISession, "sequence" | "week" | "number">

class SessionService {
    private sessionRepository: DatabaseReposatory<ISession>
    private teacherRepository: DatabaseReposatory<ITeacher>
    private studentRepository: DatabaseReposatory<IStudent>

    constructor() {
        this.sessionRepository = new DatabaseReposatory<ISession>(sessionModel)
        this.teacherRepository = new DatabaseReposatory<ITeacher>(teacherModel)
        this.studentRepository = new DatabaseReposatory<IStudent>(studentModel)
    }

    async createSession(teacherId: string, data: NewSession) {
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        return this.sessionRepository.create({
            ...data,
            teacher: new Types.ObjectId(teacherId),
            active: false,
            attendance: []
        })
    }

    async getSessions(teacherId: string) {
        const teacherExists = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id"
        })
        if (!teacherExists) {
            throw new NotFoundError("Teacher account not found")
        }

        const sessions: ISession[] = await this.sessionRepository.findall({
            filter: { teacher: teacherId },
            populate: {
                path: "attendance.student",
                select: "firstName lastName userID"
            }
        })
        return sessions.sort(
            (left, right) =>
                right.week - left.week ||
                right.number - left.number ||
                new Date(right.createdAt || 0).getTime() -
                    new Date(left.createdAt || 0).getTime()
        )
    }

    async setSessionActive(teacherId: string, sessionId: string, active: boolean) {
        const session = await this.sessionRepository.findone({
            filter: { _id: sessionId, teacher: teacherId }
        })
        if (!session) {
            throw new NotFoundError("Session not found")
        }

        if (active) {
            await this.sessionRepository.updateMany({
                filter: { teacher: teacherId, active: true, _id: { $ne: sessionId } },
                data: { $set: { active: false } }
            })
        }

        try {
            await this.sessionRepository.updateMany({
                filter: { _id: sessionId, teacher: teacherId },
                data: { $set: { active } }
            })
        } catch (error) {
            if (
                error !== null &&
                typeof error === "object" &&
                "code" in error &&
                error.code === 11000
            ) {
                throw new ConflictError("Another session was activated at the same time")
            }
            throw error
        }

        const updatedSession = await this.sessionRepository.findone({
            filter: { _id: sessionId, teacher: teacherId }
        })
        if (!updatedSession) {
            throw new NotFoundError("Session not found")
        }
        return updatedSession
    }

    async markAttendance(teacherId: string, sessionId: string, identifier: string) {
        const session = await this.sessionRepository.findone({
            filter: {
                _id: sessionId,
                teacher: teacherId,
                active: true
            }
        })
        if (!session) {
            throw new NotFoundError("Active session not found")
        }

        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "students"
        })
        if (!teacher) {
            throw new NotFoundError("Teacher account not found")
        }

        const identifierFilter = Types.ObjectId.isValid(identifier)
            ? { $or: [{ userID: identifier }, { _id: identifier }] }
            : { userID: identifier }
        const student = await this.studentRepository.findone({
            filter: {
                ...identifierFilter,
                _id: { $in: teacher.students }
            },
            select: "_id firstName lastName userID"
        })

        if (!student) {
            throw new NotFoundError("Assigned student not found")
        }

        if (session.attendance.some((entry: ISessionAttendance) => entry.student.equals(student._id))) {
            throw new ConflictError("Student is already marked present")
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
        })
        if (update.modifiedCount === 0) {
            const stillActive = await this.sessionRepository.findone({
                filter: {
                    _id: session._id,
                    teacher: teacherId,
                    active: true
                },
                select: "_id"
            })
            if (!stillActive) {
                throw new NotFoundError("Active session not found")
            }
            throw new ConflictError("Student is already marked present")
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
        }
    }
}

const sessionService = new SessionService()
export default sessionService
