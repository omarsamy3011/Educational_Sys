import mongoose, { Types } from "mongoose"
import { ISession } from "../../common/interface/session"

const sessionAttendanceSchema = new mongoose.Schema({
    student: {
        type: Types.ObjectId,
        ref: "Student",
        required: true
    },
    markedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, { _id: false })

const sessionClosingSchema = new mongoose.Schema({
    normalCost: { type: Number, min: 0, required: true },
    reducedCost: { type: Number, min: 0, required: true },
    reducedCount: { type: Number, min: 0, required: true },
    notes: { type: String, maxlength: 1000, default: "" }
}, { _id: false })

const sessionSchema = new mongoose.Schema<ISession>({
    teacher: {
        type: Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    center: {
        type: Types.ObjectId,
        ref: "Center",
        default: null
    },
    schedule: {
        type: Types.ObjectId,
        ref: "Schedule",
        default: null
    },
    sequence: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    week: {
        type: Number,
        required: true,
        min: 1,
        max: 60
    },
    number: {
        type: Number,
        required: true,
        min: 1,
        max: 999
    },
    active: {
        type: Boolean,
        default: false,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["normal", "cancelled"],
        default: "normal"
    },
    closing: { type: sessionClosingSchema, default: undefined },
    attendance: {
        type: [sessionAttendanceSchema],
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

sessionSchema.index(
    { teacher: 1, active: 1 },
    {
        unique: true,
        partialFilterExpression: { active: true }
    }
)

const sessionModel = mongoose.model<ISession>("Session", sessionSchema)

export default sessionModel
