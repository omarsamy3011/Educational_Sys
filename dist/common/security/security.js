"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareHash = exports.genertateHash = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_service_1 = require("../../config/env.service");
const genertateHash = async ({ plainText, salt = env_service_1.env.salt }) => {
    return await bcrypt_1.default.hash(plainText, Number(salt));
};
exports.genertateHash = genertateHash;
const compareHash = async ({ plainText, cypherText }) => {
    return await bcrypt_1.default.compare(plainText, cypherText);
};
exports.compareHash = compareHash;
