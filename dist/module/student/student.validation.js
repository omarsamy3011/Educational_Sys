"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.studentSchema = zod_1.default.object({
    id: zod_1.default.string().uuid(),
    name: zod_1.default.string().min(2).max(100),
    email: zod_1.default.string().email(),
    age: zod_1.default.number().min(0).optional()
});
