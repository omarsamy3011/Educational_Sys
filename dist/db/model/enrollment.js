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
const pointHistorySchema = new mongoose_1.default.Schema({
    points: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        default: "",
        maxlength: 1000
    },
    by: {
        type: mongoose_1.Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});
const transactionHistorySchema = new mongoose_1.default.Schema({
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: "",
        maxlength: 1000
    },
    by: {
        type: mongoose_1.Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});
const warningSchema = new mongoose_1.default.Schema({
    reason: {
        type: String,
        required: true,
        maxlength: 1000
    },
    by: {
        type: mongoose_1.Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});
const enrollmentSchema = new mongoose_1.default.Schema({
    teacher: {
        type: mongoose_1.Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    student: {
        type: mongoose_1.Types.ObjectId,
        ref: "Student",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "active"],
        default: "pending",
        required: true
    },
    archived: {
        type: Boolean,
        default: false,
        required: true
    },
    archivedAt: {
        type: Date,
        default: null
    },
    removedReason: {
        type: String,
        default: "",
        maxlength: 1000
    },
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    points: {
        type: Number,
        default: 0,
        required: true
    },
    pointsHistory: {
        type: [pointHistorySchema],
        default: []
    },
    transactionHistory: {
        type: [transactionHistorySchema],
        default: []
    },
    warnings: {
        type: [warningSchema],
        default: []
    },
    isBlocked: {
        type: Boolean,
        default: false,
        required: true
    },
    pricePerSession: {
        type: Number,
        min: 0,
        default: 0,
        required: true
    },
    center: {
        type: mongoose_1.Types.ObjectId,
        ref: "Center",
        default: null
    },
    adminNote: {
        type: String,
        default: "",
        maxlength: 2000
    },
    followUpAssistant: {
        type: mongoose_1.Types.ObjectId,
        ref: "Assistant",
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
enrollmentSchema.index({ teacher: 1, student: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, archived: 1, status: 1 });
const enrollmentModel = mongoose_1.default.model("Enrollment", enrollmentSchema);
exports.default = enrollmentModel;
