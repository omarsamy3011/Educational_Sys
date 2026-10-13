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
class studentService {
    studentRepository;
    teacherRepository;
    enrollmentRepository;
    requestRepository;
    constructor(studentRepository = new db_repo_1.DatabaseReposatory(student_1.default), teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default), enrollmentRepository = new db_repo_1.DatabaseReposatory(enrollment_1.default), requestRepository = new db_repo_1.DatabaseReposatory(request_1.default)) {
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.requestRepository = requestRepository;
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
            if (existingRequest.status === 'pending') {
                throw new Error('Request already pending');
            }
            if (existingRequest.status === 'accepted') {
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
}
exports.studentservice = new studentService();
