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
const aurh_controller_1 = __importDefault(require("./module/auth/aurh.controller"));
const teacher_controller_1 = __importDefault(require("./module/teacher/teacher.controller"));
const session_controller_1 = __importDefault(require("./module/session/session.controller"));
const center_controller_1 = __importDefault(require("./module/center/center.controller"));
const student_controller_1 = __importDefault(require("./module/student/student.controller"));
const node_path_1 = __importDefault(require("node:path"));
const errorHandling_1 = require("./middleware/errorHandling");
const cors_1 = __importDefault(require("cors"));
const redisService_1 = require("./common/service/redisService");
const os_1 = __importDefault(require("os"));
const node_fs_1 = require("node:fs");
const https_1 = __importDefault(require("https"));
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express_1.default.json());
    app.get('/check-health', async (req, res) => {
        (0, successresponce_1.successResponce)({ res, message: 'healthy' });
    });
    app.use(aurh_controller_1.default);
    app.use('/teacher', teacher_controller_1.default);
    app.use('/session', session_controller_1.default);
    app.use('/center', center_controller_1.default);
    app.use('/student', student_controller_1.default);
    redisService_1.redisService.connectRedis();
    app.use('/vendor', express_1.default.static(node_path_1.default.resolve(__dirname, "../node_modules/jsqr/dist")));
    app.use(errorHandling_1.globalErrorHandling);
    app.use(express_1.default.static(node_path_1.default.resolve(__dirname, "../front-end")));
    (0, connection_1.dbconnection)();
    const options = {
        key: (0, node_fs_1.readFileSync)('cert.key'),
        cert: (0, node_fs_1.readFileSync)('cert.crt')
    };
    https_1.default.createServer(options, app).listen(Number(env_service_1.env.port), "0.0.0.0", () => {
        console.log(`server is running on port ${env_service_1.env.port}`);
        console.log(`connect on the https://${Object.values(os_1.default.networkInterfaces())[0][1].address}:${env_service_1.env.port}`);
    });
};
exports.bootstrap = bootstrap;
