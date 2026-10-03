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
const assistantSchema = new mongoose_1.default.Schema({
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
    role: {
        type: String,
        enum: user_enum_1.assistantTypeEnum,
        default: user_enum_1.assistantTypeEnum.Assistant
    },
    teacher: {
        type: mongoose_1.Types.ObjectId,
        ref: 'Teacher'
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
const assistantModel = mongoose_1.default.model('Assistant', assistantSchema);
exports.default = assistantModel;
