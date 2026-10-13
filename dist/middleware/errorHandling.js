"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandling = void 0;
const globalErrorHandling = (err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const payload = {
        message: err?.message ?? 'Internal server error'
    };
    if (err?.cause !== undefined && !isProduction) {
        payload.cause = err.cause;
    }
    if (!isProduction && err?.stack) {
        payload.stack = err.stack;
    }
    return res.status(err?.status || 500).json(payload);
};
exports.globalErrorHandling = globalErrorHandling;
