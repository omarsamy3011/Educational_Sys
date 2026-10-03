"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const centerSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String
    },
    phone: {
        type: String,
        unique: true,
        required: true
    },
    textlocation: String,
    Maplocation: String,
    localphone: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
const centerModel = mongoose_1.default.model('Center', centerSchema);
exports.default = centerModel;
