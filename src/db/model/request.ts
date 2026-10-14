import mongoose, { Types } from "mongoose";
import { IRequest } from "../../common/interface/request";

const requestSchema = new mongoose.Schema<IRequest>({
    teacher: {
        type: Types.ObjectId,
        ref: "Teacher",
        required: function() {
            return this.requestedBy === "teacher";
        }
    },
    center: {
        type: Types.ObjectId,
        ref: "Center",
        required: function() {
            return this.requestedBy === "center";
        }
    },
    student: {
        type: Types.ObjectId,
        ref: "Student",
        required: function() {
            return this.requestedBy === "student";
        }
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },
    requestedBy: {
        type: String,
        enum: ["teacher", "center", "student"],
        default: "teacher"
    }
}, {
    timestamps: true
});

const requestModel = mongoose.model<IRequest>("Request", requestSchema);

export default requestModel;
