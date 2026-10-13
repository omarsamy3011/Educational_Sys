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


class studentService {
    constructor(
        private studentRepository: DatabaseReposatory<IStudent> = new DatabaseReposatory<IStudent>(studentModel),
        private teacherRepository: DatabaseReposatory<ITeacher> = new DatabaseReposatory<ITeacher>(teacherModel),
        private enrollmentRepository: DatabaseReposatory<IEnrollment> = new DatabaseReposatory<IEnrollment>(enrollmentModel),
        private requestRepository: DatabaseReposatory<IRequest> = new DatabaseReposatory<IRequest>(requestModel)
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
        if(existingRequest.status === 'pending'){
            throw new Error('Request already pending')
        }
        if(existingRequest.status === 'accepted'){
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
}

export const studentservice = new studentService()