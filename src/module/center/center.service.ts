import { Types } from "mongoose";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/exceptions/error.exceptions";
import { ICenter } from "../../common/interface/center";
import { IRequest } from "../../common/interface/request";
import { ISchedule } from "../../common/interface/schedule";
import { ISession } from "../../common/interface/session";
import { ITeacher } from "../../common/interface/teacher";
import { compareHash, genertateHash } from "../../common/security/security";
import centerModel from "../../db/model/center";
import requestModel from "../../db/model/request";
import scheduleModel from "../../db/model/schedule";
import sessionModel from "../../db/model/session";
import teacherModel from "../../db/model/teacher";
import { DatabaseReposatory } from "../../db/repository/db.repo";

type CenterProfileUpdate = {
    name?: string | undefined;
    phone?: string | undefined;
    textlocation?: string | undefined;
    Maplocation?: string | undefined;
    localphone?: string | undefined;
};

type CenterTeacher = ITeacher & { _id: Types.ObjectId };
type CenterRequest = IRequest & {
    _id: Types.ObjectId;
    teacher: CenterTeacher | Types.ObjectId;
};
type CenterSession = ISession & {
    _id: Types.ObjectId;
    teacher: CenterTeacher | Types.ObjectId;
};
type CenterSchedule = ISchedule & {
    _id: Types.ObjectId;
    teacher: CenterTeacher | Types.ObjectId;
    center?: Types.ObjectId | { name: string } | null;
};

class CenterService {
    constructor(
        private centerRepository: DatabaseReposatory<ICenter> = new DatabaseReposatory<ICenter>(centerModel),
        private requestRepository: DatabaseReposatory<IRequest> = new DatabaseReposatory<IRequest>(requestModel),
        private teacherRepository: DatabaseReposatory<ITeacher> = new DatabaseReposatory<ITeacher>(teacherModel),
        private scheduleRepository: DatabaseReposatory<ISchedule> = new DatabaseReposatory<ISchedule>(scheduleModel),
        private sessionRepository: DatabaseReposatory<ISession> = new DatabaseReposatory<ISession>(sessionModel)
        ) {}

    async getMyProfile(centerId: string) {
        if (!Types.ObjectId.isValid(centerId)) {
            throw new BadRequestError("Invalid center id")
        }

        const center = await this.centerRepository.findById({
            id: centerId,
            select: "-password -__v"
        })
        if (!center) {
            throw new NotFoundError("Center not found")
        }

        return center
    }

    async getDashboardData(centerId: string) {
        if (!Types.ObjectId.isValid(centerId)) {
            throw new BadRequestError("Invalid center id")
        }
        const centerData = await this.centerRepository.findById({
            id: centerId
        })
        if (!centerData) {
            throw new NotFoundError("Center not found")
        }

        const centerObjectId = new Types.ObjectId(centerId)
        const [teachers, requests, sessions, slots] = await Promise.all([
            this.teacherRepository.findall({
                filter: { center: centerObjectId },
                select: "_id firstName lastName userName email phone companyName subject teachingLanguage gender profilepic students"
            }),
            this.requestRepository.findall({ filter: { center: centerObjectId, status: "pending" } }),
            this.sessionRepository.findall({ filter: { center: centerObjectId } }),
            this.scheduleRepository.findall({
                filter: { center: centerObjectId, isActive: true },
                populate: { path: "teacher", select: "_id firstName lastName userName subject" }
            })
        ]) as [CenterTeacher[], CenterRequest[], CenterSession[], CenterSchedule[]]
        const pending = requests.filter((request) => (request.requestedBy ?? "teacher") === "teacher")
        const invitations = requests.filter((request) => request.requestedBy === "center")
        const activeSessions = sessions.filter((session) => session.status !== "cancelled")
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const thisWeek = activeSessions.filter((session) => new Date(session.date ?? session.createdAt ?? 0) >= weekAgo)
        const today = new Date().getDay()
        const students = new Set(teachers.flatMap((teacher) => (teacher.students ?? []).map((studentId) => String(studentId))))

        return {
            counts: {
                teachers: teachers.length,
                pending: pending.length,
                invitations: invitations.length,
                sessionsThisWeek: thisWeek.length,
                attendanceThisWeek: thisWeek.reduce((total, session) => total + session.attendance.length, 0),
                students: students.size
            },
            closingsDue: thisWeek.reduce((total, session) => total + (this.closingTotals(session)?.total ?? 0), 0),
            today: slots.filter((slot) => slot.dayOfWeek === today).map((slot) => this.scheduleView(slot, centerData.name)),
            activeSessions: sessions.filter((session) => session.active && session.status !== "cancelled").map((session) => ({
                _id: session._id,
                sequence: session.sequence,
                teacher: this.teacherView(teachers.find((teacher) => String(teacher._id) === String(session.teacher))),
                presentCount: session.attendance.length
            })),
            byTeacher: teachers.map((teacher) => ({
                label: `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim() || teacher.userName,
                value: activeSessions
                    .filter((session) => String(session.teacher) === String(teacher._id))
                    .reduce((total, session) => total + session.attendance.length, 0)
            })),
            recentSessions: activeSessions
                .slice()
                .sort((left, right) => new Date(right.date ?? right.createdAt ?? 0).getTime() - new Date(left.date ?? left.createdAt ?? 0).getTime())
                .slice(0, 6)
                .map((session) => ({
                    _id: session._id,
                    sequence: session.sequence,
                    date: session.date ?? session.createdAt,
                    teacher: this.teacherView(teachers.find((teacher) => String(teacher._id) === String(session.teacher))),
                    presentCount: session.attendance.length,
                    closing: this.closingTotals(session)
                }))
        }
    }

    private teacherView(teacher: unknown) {
        if (!teacher || typeof teacher !== "object" || !("userName" in teacher)) return null
        const data = teacher as CenterTeacher
        return {
            _id: data._id,
            userName: data.userName,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            companyName: data.companyName,
            subject: data.subject,
            teachingLanguage: data.teachingLanguage,
            gender: data.gender,
            profilepic: data.profilepic,
            createdAt: data.createdAt
        }
    }

    private scheduleView(slot: CenterSchedule, centerName?: string) {
        const teacher = slot.teacher && typeof slot.teacher === "object" && "userName" in slot.teacher
            ? this.teacherView(slot.teacher)
            : null
        const populatedCenter = slot.center && typeof slot.center === "object" && "name" in slot.center
            ? slot.center.name
            : ""
        return {
            _id: slot._id,
            title: slot.title,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            durationMinutes: slot.durationMinutes,
            center: typeof slot.center === "object" && slot.center !== null && "_id" in slot.center
                ? slot.center._id
                : slot.center ?? null,
            centerName: centerName ?? populatedCenter,
            grade: slot.grade ?? "",
            notes: slot.notes ?? "",
            isActive: slot.isActive,
            teacher
        }
    }

    private closingTotals(session: ISession) {
        if (!session.closing) return null
        const present = session.attendance.length
        const reducedCount = Math.min(present, session.closing.reducedCount ?? 0)
        const normalCount = present - reducedCount
        return {
            ...session.closing,
            present,
            normalCount,
            reducedCount,
            total: normalCount * session.closing.normalCost + reducedCount * session.closing.reducedCost
        }
    }

    async getCenterTeachers(centerId: string) {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const center = await this.centerRepository.findById({ id: centerId, select: "name" })
        if (!center) throw new NotFoundError("Center not found")

        const centerObjectId = new Types.ObjectId(centerId)
        const [requests, activeTeachers] = await Promise.all([
            this.requestRepository.findall({
                filter: { center: centerObjectId, status: { $ne: "rejected" } },
                populate: {
                    path: "teacher",
                    select: "_id firstName lastName userName email phone companyName subject teachingLanguage gender profilepic createdAt"
                }
            }),
            this.teacherRepository.findall({
                filter: { center: centerObjectId },
                select: "_id firstName lastName userName email phone companyName subject teachingLanguage gender profilepic createdAt students"
            })
        ]) as [CenterRequest[], CenterTeacher[]]
        const validRequests = requests.filter((request) => Boolean(request.teacher))
        const activeTeacherIds = new Set(activeTeachers.map((teacher) => String(teacher._id)))
        const requestTeacherIds = new Set(validRequests.map((request) => String(
            typeof request.teacher === "object" && "userName" in request.teacher ? request.teacher._id : request.teacher
        )))
        const links = [
            ...validRequests.map((request) => ({
                teacher: request.teacher,
                status: request.status === "accepted" || activeTeacherIds.has(String(
                    typeof request.teacher === "object" && "userName" in request.teacher ? request.teacher._id : request.teacher
                )) ? "active" : "pending",
                requestedBy: request.requestedBy ?? "teacher",
                createdAt: request.createdAt
            })),
            ...activeTeachers
                .filter((teacher) => !requestTeacherIds.has(String(teacher._id)))
                .map((teacher) => ({
                    teacher,
                    status: "active",
                    requestedBy: "teacher",
                    createdAt: teacher.createdAt
                }))
        ]

        return Promise.all(links.map(async (link) => {
            const teacherId = String(
                typeof link.teacher === "object" && "userName" in link.teacher ? link.teacher._id : link.teacher
            )
            const [sessions, slots] = await Promise.all([
                this.sessionRepository.findall({
                    filter: { center: centerObjectId, teacher: new Types.ObjectId(teacherId) }
                }),
                this.scheduleRepository.findall({
                    filter: {
                        center: centerObjectId,
                        teacher: new Types.ObjectId(teacherId),
                        isActive: true
                    }
                })
            ]) as [CenterSession[], CenterSchedule[]]
            const heldSessions = sessions.filter((session) => session.status !== "cancelled")
            return {
                teacher: this.teacherView(link.teacher),
                status: link.status,
                requestedBy: link.requestedBy,
                createdAt: link.createdAt,
                studentsCount: (activeTeachers.find((teacher) => String(teacher._id) === teacherId)?.students ?? []).length,
                sessionsCount: heldSessions.length,
                attendanceCount: heldSessions.reduce((total, session) => total + session.attendance.length, 0),
                lastSessionAt: heldSessions
                    .map((session) => session.date ?? session.createdAt)
                    .filter(Boolean)
                    .sort((left, right) => new Date(right!).getTime() - new Date(left!).getTime())[0] ?? null,
                slots: slots.map((slot) => this.scheduleView(slot, center.name))
            }
        }))
    }

    async inviteTeacher(centerId: string, identifier: string) {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const center = await this.centerRepository.findById({ id: centerId, select: "_id" })
        if (!center) throw new NotFoundError("Center not found")
        const normalizedIdentifier = identifier.trim()
        const escapedIdentifier = normalizedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const teacher = await this.teacherRepository.findone({
            filter: {
                $or: [
                    { userName: { $regex: `^${escapedIdentifier}$`, $options: "i" } },
                    { email: { $regex: `^${escapedIdentifier}$`, $options: "i" } },
                    { phone: normalizedIdentifier }
                ]
            },
            select: "_id center"
        })
        if (!teacher) throw new NotFoundError("Teacher not found")

        const centerObjectId = new Types.ObjectId(centerId)
        const teacherId = String(teacher._id)
        const existing = await this.requestRepository.findone({
            filter: { center: centerObjectId, teacher: teacher._id }
        })
        const alreadyLinked = teacher.center?.some((id: unknown) => String(id) === centerId)
        if (alreadyLinked || existing?.status === "accepted") {
            throw new ConflictError("This teacher already works with your center")
        }

        if (existing?.status === "pending" && (existing.requestedBy ?? "teacher") === "teacher") {
            await this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $addToSet: { center: centerObjectId } },
                select: "_id"
            })
            await this.requestRepository.findByIdAndUpdate({
                id: String(existing._id),
                data: { $set: { status: "accepted" } }
            })
        } else if (existing) {
            await this.requestRepository.findByIdAndUpdate({
                id: String(existing._id),
                data: { $set: { status: "pending", requestedBy: "center", createdAt: new Date() } }
            })
        } else {
            await this.requestRepository.create({
                teacher: teacher._id,
                center: centerObjectId,
                status: "pending",
                requestedBy: "center"
            } as IRequest)
        }
        const links = await this.getCenterTeachers(centerId)
        const invitedLink = links.find((link) => {
            const linkedTeacher = link.teacher as { _id?: unknown } | null
            return String(linkedTeacher?._id) === teacherId
        })
        if (!invitedLink) throw new NotFoundError("Teacher invitation could not be retrieved")
        return invitedLink
    }

    async answerTeacherRequest(centerId: string, teacherId: string, status: "active" | "rejected") {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        if (!Types.ObjectId.isValid(teacherId)) throw new BadRequestError("Invalid teacher id")
        if (status !== "active" && status !== "rejected") throw new BadRequestError("Status must be active or rejected")

        const request = await this.requestRepository.findone({
            filter: { center: new Types.ObjectId(centerId), teacher: new Types.ObjectId(teacherId) }
        })
        if (!request) throw new NotFoundError("Teacher request not found")
        if (request.status !== "pending") throw new ConflictError("This request has already been processed")
        if ((request.requestedBy ?? "teacher") !== "teacher") {
            throw new ConflictError("Waiting for the teacher to answer your invitation")
        }

        await this.requestRepository.findByIdAndUpdate({
            id: String(request._id),
            data: { $set: { status: status === "active" ? "accepted" : "rejected" } }
        })
        if (status === "active") {
            await this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $addToSet: { center: new Types.ObjectId(centerId) } },
                select: "_id"
            })
        }
        const links = await this.getCenterTeachers(centerId)
        const updatedLink = links.find((link) => {
            const linkedTeacher = link.teacher as { _id?: unknown } | null
            return String(linkedTeacher?._id) === teacherId
        })
        if (updatedLink) return updatedLink
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "_id firstName lastName userName email phone companyName subject teachingLanguage gender profilepic createdAt"
        })
        if (!teacher) throw new NotFoundError("Teacher not found")
        return {
            teacher: this.teacherView(teacher),
            status,
            requestedBy: "teacher",
            createdAt: request.createdAt
        }
    }

    async removeTeacher(centerId: string, teacherId: string) {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        if (!Types.ObjectId.isValid(teacherId)) throw new BadRequestError("Invalid teacher id")
        const centerObjectId = new Types.ObjectId(centerId)
        const teacher = await this.teacherRepository.findById({
            id: teacherId,
            select: "center"
        })
        if (!teacher) throw new NotFoundError("Teacher not found")
        const request = await this.requestRepository.findone({
            filter: { center: centerObjectId, teacher: new Types.ObjectId(teacherId) }
        })
        const linked = teacher.center?.some((id: unknown) => String(id) === centerId)
        if (!linked && !request) throw new NotFoundError("Teacher is not linked to this center")

        await Promise.all([
            this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: { $pull: { center: centerObjectId } },
                select: "_id"
            }),
            this.requestRepository.deleteone({
                filter: { center: centerObjectId, teacher: new Types.ObjectId(teacherId) }
            })
        ])
        return { id: teacherId }
    }

    async getCenterSchedule(centerId: string) {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const center = await this.centerRepository.findById({ id: centerId, select: "name" })
        if (!center) throw new NotFoundError("Center not found")
        const [teachers, slots] = await Promise.all([
            this.teacherRepository.findall({ filter: { center: new Types.ObjectId(centerId) }, select: "_id" }),
            this.scheduleRepository.findall({
                filter: { center: new Types.ObjectId(centerId), isActive: true },
                populate: { path: "teacher", select: "_id firstName lastName userName email phone companyName subject teachingLanguage gender profilepic createdAt" }
            })
        ]) as [CenterTeacher[], CenterSchedule[]]
        const activeIds = new Set(teachers.map((teacher) => String(teacher._id)))
        return slots
            .filter((slot) => activeIds.has(String(
                typeof slot.teacher === "object" && "userName" in slot.teacher ? slot.teacher._id : slot.teacher
            )))
            .map((slot) => this.scheduleView(slot, center.name))
            .sort((left, right) => left.dayOfWeek - right.dayOfWeek || left.startTime.localeCompare(right.startTime))
    }

    async getCenterSessions(centerId: string, from?: string, to?: string) {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const center = await this.centerRepository.findById({ id: centerId, select: "_id" })
        if (!center) throw new NotFoundError("Center not found")
        const range: Record<string, Date> = {}
        if (from) {
            const start = new Date(from)
            if (Number.isNaN(start.getTime())) throw new BadRequestError("Invalid from date")
            range.$gte = start
        }
        if (to) {
            const end = new Date(to)
            if (Number.isNaN(end.getTime())) throw new BadRequestError("Invalid to date")
            end.setUTCHours(23, 59, 59, 999)
            range.$lte = end
        }
        if (from && to && range.$gte! > range.$lte!) throw new BadRequestError("The from date must be before the to date")

        const sessions = await this.sessionRepository.findall({
            filter: {
                center: new Types.ObjectId(centerId),
                ...(Object.keys(range).length ? { date: range } : {})
            },
            populate: { path: "teacher", select: "_id firstName lastName userName email phone companyName subject teachingLanguage gender profilepic createdAt" }
        }) as CenterSession[]
        return sessions
            .slice()
            .sort((left, right) => new Date(right.date ?? right.createdAt ?? 0).getTime() - new Date(left.date ?? left.createdAt ?? 0).getTime())
            .map((session) => ({
                _id: session._id,
                sequence: session.sequence,
                week: session.week,
                number: session.number,
                date: session.date ?? session.createdAt,
                status: session.status ?? "normal",
                active: session.active,
                teacher: this.teacherView(session.teacher),
                presentCount: session.attendance.length,
                closing: this.closingTotals(session)
            }))
    }

    async updateMyProfile(
        centerId: string,
        updateData: CenterProfileUpdate
    ) {
        if (!Types.ObjectId.isValid(centerId)) {
            throw new BadRequestError("Invalid center id")
        }

        if (updateData.name) {
            const existingCenter = await this.centerRepository.findone({
                filter: {
                    name: updateData.name,
                    _id: { $ne: centerId }
                }
            })
            if (existingCenter) {
                throw new ConflictError("Center name already taken")
            }
        }

        if (updateData.phone) {
            const existingCenter = await this.centerRepository.findone({
                filter: {
                    phone: updateData.phone,
                    _id: { $ne: centerId }
                }
            })
            if (existingCenter) {
                throw new ConflictError("Phone number already registered")
            }
        }

        const center = await this.centerRepository.findByIdAndUpdate({
            id: centerId,
            data: { $set: updateData },
            select: "-password -__v"
        })
        if (!center) {
            throw new NotFoundError("Center not found")
        }

        return center
    }

    async searchCenters(query?: string) {
        const normalizedQuery = query?.trim()
        const terms = normalizedQuery
            ? normalizedQuery.split(/\s+/).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            : []
        const filter = normalizedQuery
            ? {
                $and: terms.map((term) => ({
                    $or: [
                        { name: { $regex: term, $options: "i" } },
                        { textlocation: { $regex: term, $options: "i" } }
                    ]
                }))
            }
            : {}
        const centers = await this.centerRepository.findall({
            filter,
            select: "_id name phone localphone textlocation Maplocation"
        })
        return centers
    }

    async changePassword(centerId: string, currentPassword: string, newPassword: string) {
        if (!Types.ObjectId.isValid(centerId)) throw new BadRequestError("Invalid center id")
        const center = await this.centerRepository.findById({ id: centerId, select: "password" })
        if (!center) throw new NotFoundError("Center not found")
        const validPassword = await compareHash({
            plainText: currentPassword,
            cypherText: center.password
        })
        if (!validPassword) throw new BadRequestError("Current password is incorrect")
        const password = await genertateHash({ plainText: newPassword })
        await this.centerRepository.findByIdAndUpdate({
            id: centerId,
            data: { $set: { password } },
            select: "_id"
        })
        return { updated: true }
    }

    async getPendingRequests(centerId: string) {
        if (!Types.ObjectId.isValid(centerId)) {
            throw new BadRequestError("Invalid center id")
        }
        const requests = await this.requestRepository.findall({
            filter: {
                center: new Types.ObjectId(centerId),
                status: "pending",
                $or: [{ requestedBy: "teacher" }, { requestedBy: { $exists: false } }]
            },
            populate: [{
                path: "teacher",
                select: "_id firstName lastName userName email phone companyName subject"
            }]
        }) as CenterRequest[]
        return requests.filter((request) => Boolean(request.teacher))
    }

    async decideRequest(centerId: string, requestId: string, action: "accept" | "reject") {
        if (!Types.ObjectId.isValid(centerId)) {
            throw new BadRequestError("Invalid center id")
        }
        if (!Types.ObjectId.isValid(requestId)) {
            throw new BadRequestError("Invalid request id")
        }
        if (!["accept", "reject"].includes(action)) {
            throw new BadRequestError("Action must be either accept or reject")
        }

        const request = await this.requestRepository.findById({
            id: requestId,
            populate: [{
                path: "teacher",
                select: "_id center firstName lastName userName email phone"
            }, {
                path: "center",
                select: "_id name"
            }]
        })

        if (!request) {
            throw new NotFoundError("Request not found")
        }

        if (request.status !== "pending") {
            throw new ConflictError("This request has already been processed")
        }

        if (String(request.center?._id ?? request.center) !== centerId) {
            throw new ConflictError("This request does not belong to your center")
        }

        const teacherId = String(request.teacher?._id ?? request.teacher)
        if (!teacherId) {
            throw new NotFoundError("Teacher not found")
        }

        const teacher = await this.teacherRepository.findById({ id: teacherId, select: "center" })
        if (!teacher) {
            throw new NotFoundError("Teacher not found")
        }
        if ((request.requestedBy ?? "teacher") !== "teacher") {
            throw new ConflictError("Only teacher requests can be answered by the center")
        }
        if (action === "accept") {
            await this.teacherRepository.findByIdAndUpdate({
                id: teacherId,
                data: {
                    $addToSet: { center: new Types.ObjectId(centerId) }
                },
                select: "center"
            })
        }

        await this.requestRepository.findByIdAndUpdate({
            id: requestId,
            data: { $set: { status: action === "accept" ? "accepted" : "rejected" } }
        })
        return {
            id: requestId,
            status: action === "accept" ? "accepted" : "rejected"
        }
    }
}

export const centerService = new CenterService()