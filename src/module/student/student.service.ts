import { Types } from "mongoose";
import { IEnrollment } from "../../common/interface/enrollment";
import { IRequest } from "../../common/interface/request";
import { IStudent } from "../../common/interface/stud";
import { ITeacher } from "../../common/interface/teacher";
import enrollmentModel from "../../db/model/enrollment";
import requestModel from "../../db/model/request";
import studentModel from "../../db/model/student";
import teacherModel from "../../db/model/teacher";
import { DatabaseReposatory } from "../../db/repository/db.repo";
import sessionModel from "../../db/model/session";
import scheduleModel from "../../db/model/schedule";
import centerModel from "../../db/model/center";
import assistantModel from "../../db/model/assistant";
import { ISession } from "../../common/interface/session";


class studentService {
    constructor(
        private studentRepository: DatabaseReposatory<IStudent> = new DatabaseReposatory<IStudent>(studentModel),
        private teacherRepository: DatabaseReposatory<ITeacher> = new DatabaseReposatory<ITeacher>(teacherModel),
        private enrollmentRepository: DatabaseReposatory<IEnrollment> = new DatabaseReposatory<IEnrollment>(enrollmentModel),
        private requestRepository: DatabaseReposatory<IRequest> = new DatabaseReposatory<IRequest>(requestModel),
        private sessionRepository: DatabaseReposatory<ISession> = new DatabaseReposatory<ISession>(sessionModel)
) {
}

    async getMyProfile(id:string){
        const data = await this.studentRepository.findById({id:id,
            select:'-password -createdAt -updatedAt -__v'
        });
        return data
    }

    async updateMyProfile(id:string, data:Partial<IStudent>){
        const updatedData = await this.studentRepository.findByIdAndUpdate({id:id, data:data,
            select:'firstName lastName parentPhone schoolName profilepic'
        })
        return updatedData
    }

    async getMyTeachers(id:string){
        const teachers = await this.teacherRepository.findall({
            filter:{students:{$in:[id]}},
            select:'id userName phone companyName firstName lastName subject teachingLanguage  profilepic bio createdAt'
        })
        const enrollment = await this.enrollmentRepository.findall({
            filter:{student:id, archived:false},
            select:'teacher status joinedAt balance',
            populate:{path:'teacher', select:'id userName phone companyName firstName lastName subject teachingLanguage  profilepic bio'}
        })
        return Promise.all(enrollment.map(async (enrol:any) => {
            return {
                teacher:enrol.teacher,
                status: enrol.status,
                joinedAt: enrol.joinedAt,
                balance: enrol.status === 'active' ? enrol.balance : null
            }
        }))
}

    async sendRequestToTeacher(studentId:string, teacherId:string){
        const teacher = await this.teacherRepository.findById({id:teacherId, select:'id'})
        if(!teacher){
            throw new Error('Teacher not found')
        }
        const existingRequest = await this.requestRepository.findone({
            filter:{teacher:teacherId, student:studentId, requestedBy:'student'}
        })
        if(existingRequest){
        if(existingRequest.status == 'pending'){
            throw new Error('Request already pending')
        }
        if(existingRequest.status == 'accepted'){
            throw new Error('Request already accepted')
        }}

        const request = await this.requestRepository.create({
            teacher:new Types.ObjectId(teacherId),
            student:new Types.ObjectId(studentId),
            status:'pending',
            requestedBy:'student'
        })
        return request
    }

    async getTeacherOverview(studentId: string, teacherId: string) {
        const teacherObjectId = new Types.ObjectId(teacherId)
        const studentObjectId = new Types.ObjectId(studentId)
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
        ])
        if (!teacher) {
            throw new Error("Teacher not found")
        }
        if (!enrollment) {
            throw new Error("No active subscription found")
        }

        const attendanceFilter = {
            attendance: { $elemMatch: { student: studentObjectId } }
        }
        const sessionFilters = []
        if (enrollment.center) {
            sessionFilters.push({
                $or: [attendanceFilter, { center: enrollment.center }]
            })
        }
        if (enrollment.joinedAt) {
            sessionFilters.push({
                $or: [attendanceFilter, { date: { $gte: enrollment.joinedAt } }]
            })
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
            sessionModel.find({
                teacher: teacherObjectId,
                ...(sessionFilters.length ? { $and: sessionFilters } : {})
            })
                .select("_id sequence week number date createdAt status active center attendance")
                .sort({ date: -1, createdAt: -1 })
                .lean()
                .exec(),
            scheduleModel.find({
                teacher: teacherObjectId,
                isActive: true,
                ...(enrollment.center ? { center: enrollment.center } : {})
            })
                .select("_id title dayOfWeek startTime durationMinutes center")
                .lean()
                .exec(),
            enrollment.center
                ? centerModel.findById(enrollment.center).select("_id name").lean().exec()
                : null,
            enrollment.followUpAssistant
                ? assistantModel.findOne({
                    _id: enrollment.followUpAssistant,
                    teacher: teacherObjectId
                }).select("firstName lastName phone").lean().exec()
                : null
        ])

        const scheduleCenterIds = [...new Set(
            schedules.map((schedule) => schedule.center ? String(schedule.center) : "").filter(Boolean)
        )]
        const scheduleCenters = scheduleCenterIds.length
            ? await centerModel.find({ _id: { $in: scheduleCenterIds } }).select("_id name").lean().exec()
            : []
        const scheduleCenterNames = new Map(
            scheduleCenters.map((scheduleCenter) => [String(scheduleCenter._id), scheduleCenter.name])
        )

        const rankedEnrollments: IEnrollment[] = enrollments
            .filter((entry: IEnrollment) => entry.student)
            .sort((left: IEnrollment, right: IEnrollment) => right.points - left.points)
        const rank = rankedEnrollments.findIndex(
            (entry: IEnrollment) => String(entry.student) === studentId
        ) + 1
        const studentSessions = sessions.map((session) => {
            const attendance = session.attendance.find(
                (entry) => String(entry.student) === studentId
            )
            const status = session.status === "cancelled"
                ? "cancelled"
                : attendance
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
                status
            }
        })
        const countedSessions = studentSessions.filter(
            (row) => row.status === "present" || row.status === "absent"
        )
        const presentCount = countedSessions.filter((row) => row.status === "present").length

        const now = new Date()
        const minutesNow = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes()
        const nextSlot = schedules
            .map((schedule) => {
                const startTimeMinutes =
                    Number(schedule.startTime.slice(0, 2)) * 60 +
                    Number(schedule.startTime.slice(3, 5))
                let startsInMinutes = schedule.dayOfWeek * 1440 + startTimeMinutes - minutesNow
                if (startsInMinutes < 0) startsInMinutes += 7 * 1440
                return {
                    ...schedule,
                    centerName: schedule.center ? scheduleCenterNames.get(String(schedule.center)) ?? "" : "",
                    startsInMinutes
                }
            })
            .sort((left, right) => left.startsInMinutes - right.startsInMinutes)[0] ?? null
        const followUpName = followUpAssistant
            ? [followUpAssistant.firstName, followUpAssistant.lastName].filter(Boolean).join(" ")
            : ""

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
        }
    }

    async getTeacherSessions(studentId: string, teacherId: string) {
        const attendanceFilter = {
            attendance: { $elemMatch: { student: studentId } }
        }
        const session = await this.sessionRepository.findall({
            filter:{teacher:teacherId},
            select:'sequence week number date center attendance price',
            populate:[{path:'center',select:'name'}]
        })
        
        const newsession = session.map((ele:any)=>{
            const student = ele.attendance.find((ele:any)=> ele.student.toString() === studentId.toString())
            const status = student ? 'present' : 'absent'
            const markedAt = student ? student.markedAt : null
            const location = ele.center.name || 'online'
            const homeworkStatus = null
            const payment = ele.price
            const comment = ''
            return {
                session:ele,
                status,markedAt,location,homeworkStatus,payment,comment
            }
        })
        return newsession
    }
}

export const studentservice = new studentService()