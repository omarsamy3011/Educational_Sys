"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherService = void 0;
const error_exceptions_1 = require("../../common/exceptions/error.exceptions");
const teacher_1 = __importDefault(require("../../db/model/teacher"));
const student_1 = __importDefault(require("../../db/model/student"));
const db_repo_1 = require("../../db/repository/db.repo");
class TeacherService {
    teacherRepository;
    studentRepository;
    constructor() {
        this.teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default);
        this.studentRepository = new db_repo_1.DatabaseReposatory(student_1.default);
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
        const student = await this.studentRepository.findById({
            id: studentId,
            select: "firstName lastName userID phone profilepic gender grade schoolName learningLanguage"
        });
        if (!student) {
            throw new error_exceptions_1.NotFoundError("Student not found");
        }
        return student;
    }
}
exports.TeacherService = TeacherService;
const teacherService = new TeacherService();
exports.default = teacherService;
