import { ITeacher } from "../../common/interface/teacher"
import { IStudent } from "../../common/interface/stud"
import { IAssistant } from "../../common/interface/assis"
import { ConflictError, NotFoundError } from "../../common/exceptions/error.exceptions"
import teacherModel from "../../db/model/teacher"
import studentModel from "../../db/model/student"
import assistantModel from "../../db/model/assistant"
import { DatabaseReposatory } from "../../db/repository/db.repo"
import { genertateHash } from "../../common/security/security"
import { Types } from "mongoose"

type TeacherProfileUpdate = {
    firstName?: string | undefined
    lastName?: string | undefined
    profilepic?: string | undefined
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
}

export class TeacherService {
    private teacherRepository : DatabaseReposatory<ITeacher>
    private studentRepository : DatabaseReposatory<IStudent>
    private assistantRepository : DatabaseReposatory<IAssistant>
    constructor(){
        this.teacherRepository = new DatabaseReposatory<ITeacher>(teacherModel)
        this.studentRepository = new DatabaseReposatory<IStudent>(studentModel)
        this.assistantRepository = new DatabaseReposatory<IAssistant>(assistantModel)
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

        const student = await this.studentRepository.findById({
            id: studentId,
            select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
        })
        if (!student) {
            throw new NotFoundError("Student not found")
        }
        return student
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
            ...(data.lastName === undefined ? {} : { lastName: data.lastName })
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
}

const teacherService = new TeacherService()
export default teacherService