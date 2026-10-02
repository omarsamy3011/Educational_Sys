"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandling = void 0;
const globalErrorHandling = (err, req, res, next) => {
    return res.status(err.status || 500).json({
        message: err.message,
        stack: err.stack,
        cause: err.cause,
        err
    });
};
exports.globalErrorHandling = globalErrorHandling;
