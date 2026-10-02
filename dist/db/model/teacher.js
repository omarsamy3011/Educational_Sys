"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_enum_1 = require("../../common/enum/user.enum");
const subject_enum_1 = require("../../common/enum/subject.enum");
const teacherSchema = new mongoose_1.default.Schema({
    firstName: String,
    lastName: String,
    userName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        unique: true,
        required: true
    },
    password: String,
    confirmEmail: {
        type: Boolean,
        default: false
    },
    profilepic: {
        type: String,
        required: false
    },
    gender: {
        type: String,
        enum: user_enum_1.genderEnum,
        default: user_enum_1.genderEnum.Male,
    },
    provider: {
        type: String,
        enum: user_enum_1.providerEnum,
        default: user_enum_1.providerEnum.System
    },
    companyName: {
        type: String,
        unique: true
    },
    subject: {
        type: [String],
        enum: subject_enum_1.subjectEnum
    },
    teachingLanguage: {
        type: String,
        enum: subject_enum_1.teachingLanguageEnum
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
teacherSchema.virtual('userName').set(function (userName) {
    let [firstName, lastName] = userName.split(' ');
    this.firstName = firstName;
    this.lastName = lastName;
}).get(function () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});
const teacherModel = mongoose_1.default.model('Teacher', teacherSchema);
exports.default = teacherModel;
