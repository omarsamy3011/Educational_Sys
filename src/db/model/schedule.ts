import mongoose, { Types } from "mongoose";
import { ISchedule } from "../../common/interface/schedule";

const scheduleSchema = new mongoose.Schema<ISchedule>({
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
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    dayOfWeek: {
        type: Number,
        required: true,
        min: 0,
        max: 6
    },
    startTime: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    durationMinutes: {
        type: Number,
        default: 90,
        min: 15,
        max: 720
    },
    grade: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: "",
        maxlength: 1000
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const scheduleModel = mongoose.model<ISchedule>("Schedule", scheduleSchema);

export default scheduleModel;
