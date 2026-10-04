import { ITeacher } from "../../common/interface/teacher"
import { IStudent } from "../../common/interface/stud"
import { ConflictError, NotFoundError } from "../../common/exceptions/error.exceptions"
import teacherModel from "../../db/model/teacher"
import studentModel from "../../db/model/student"
import { DatabaseReposatory } from "../../db/repository/db.repo"

type TeacherProfileUpdate = {
    firstName?: string | undefined
    lastName?: string | undefined
    profilepic?: string | undefined
    gender?: string | undefined
    companyName?: string | undefined
    subject?: string[] | undefined
    teachingLanguage?: string | undefined
}

export class TeacherService {
    private teacherRepository : DatabaseReposatory<ITeacher>
    private studentRepository : DatabaseReposatory<IStudent>
    constructor(){
        this.teacherRepository = new DatabaseReposatory<ITeacher>(teacherModel)
        this.studentRepository = new DatabaseReposatory<IStudent>(studentModel)
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
}

const teacherService = new TeacherService()
export default teacherService