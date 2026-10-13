"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const user_enum_1 = require("../../common/enum/user.enum");
const subject_enum_1 = require("../../common/enum/subject.enum");
const studentSchema = new mongoose_1.default.Schema({
    firstName: String,
    lastName: String,
    userID: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        unique: true,
        required: true
    },
    parentPhone: String,
    password: String,
    confirmAccount: {
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
    grade: {
        type: String,
        enum: user_enum_1.gradeEnum
    },
    schoolName: String,
    learningLanguage: {
        type: String,
        enum: subject_enum_1.teachingLanguageEnum
    },
    balance: {
        type: Number,
        default: 0
    },
    pricePerSession: {
        type: Number,
        min: 0,
        default: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    center: {
        type: mongoose_1.Types.ObjectId,
        ref: 'Center'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
studentSchema.virtual('userName').set(function (userName) {
    let [firstName, lastName] = userName.split(' ');
    this.firstName = firstName;
    this.lastName = lastName;
}).get(function () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});
const studentModel = mongoose_1.default.model('Student', studentSchema);
exports.default = studentModel;
