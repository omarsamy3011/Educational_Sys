"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
(0, dotenv_1.config)({ path: path_1.default.resolve(`./src/config/.env.${process.env.NODE_ENV}`) });
exports.env = {
    port: process.env.port,
    dataBase_url: process.env.dataBase_url,
    salt: process.env.salt,
    admin_signature: process.env.admin_signature,
    user_signature: process.env.user_signature,
    user_refresh_signature: process.env.user_refresh_signature,
    admin_refresh_signature: process.env.admin_refresh_signature,
    google_app_password: process.env.google_app_password,
    google_email: process.env.google_email,
    server_URL: process.env.server_URL,
    redis_url: process.env.redis_url,
    s3_accessKey: process.env.s3_accessKey,
    s3_secretKey: process.env.s3_secretKey,
    s3_BucketName: process.env.s3_BucketName,
    db_name: process.env.db_name
};
