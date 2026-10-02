"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = void 0;
const express_1 = __importDefault(require("express"));
const env_service_1 = require("./config/env.service");
const connection_1 = require("./db/connection");
const successresponce_1 = require("./common/exceptions/successresponce");
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get('/check-health', async (req, res) => {
        (0, successresponce_1.successResponce)({ res, message: 'healthy' });
    });
    (0, connection_1.dbconnection)();
    app.listen(env_service_1.env.port, () => {
        console.log(`server is running on port ${env_service_1.env.port}`);
    });
};
exports.bootstrap = bootstrap;
