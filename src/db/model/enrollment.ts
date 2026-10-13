import mongoose, { Types } from "mongoose";
import { IEnrollment } from "../../common/interface/enrollment";

const pointHistorySchema = new mongoose.Schema({
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
        type: Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

const transactionHistorySchema = new mongoose.Schema({
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
        type: Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

const warningSchema = new mongoose.Schema({
    reason: {
        type: String,
        required: true,
        maxlength: 1000
    },
    by: {
        type: Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

const enrollmentSchema = new mongoose.Schema<IEnrollment>({
    teacher: {
        type: Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    student: {
        type: Types.ObjectId,
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
        type: Types.ObjectId,
        ref: "Center",
        default: null
    },
    adminNote: {
        type: String,
        default: "",
        maxlength: 2000
    },
    followUpAssistant: {
        type: Types.ObjectId,
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

const enrollmentModel = mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);

export default enrollmentModel;
