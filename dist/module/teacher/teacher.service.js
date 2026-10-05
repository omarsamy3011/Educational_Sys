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
const db_repo_1 = require("../../db/repository/db.repo");
const security_1 = require("../../common/security/security");
const mongoose_1 = require("mongoose");
class TeacherService {
    teacherRepository;
    studentRepository;
    assistantRepository;
    constructor() {
        this.teacherRepository = new db_repo_1.DatabaseReposatory(teacher_1.default);
        this.studentRepository = new db_repo_1.DatabaseReposatory(student_1.default);
        this.assistantRepository = new db_repo_1.DatabaseReposatory(assistant_1.default);
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
            ...(data.lastName === undefined ? {} : { lastName: data.lastName })
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
}
exports.TeacherService = TeacherService;
const teacherService = new TeacherService();
exports.default = teacherService;
