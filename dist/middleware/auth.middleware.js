"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.auth = void 0;
const token_1 = require("../common/service/token");
const error_exceptions_1 = require("../common/exceptions/error.exceptions");
const tokenService = new token_1.TokenService();
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new error_exceptions_1.UnauthorizedError('No token sent'));
        }
        const parts = authHeader.split(' ');
        let token = '';
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
        else if (parts.length === 1) {
            token = parts[0];
        }
        if (!token) {
            return next(new error_exceptions_1.UnauthorizedError('Invalid token format'));
        }
        const data = tokenService.decodeToken(token);
        req.user = data;
        next();
    }
    catch (error) {
        next(error instanceof error_exceptions_1.UnauthorizedError ? error : new error_exceptions_1.UnauthorizedError('Invalid or expired token'));
    }
};
exports.auth = auth;
const requireRole = (allowedRoles) => (req, res, next) => {
    if (!req.user || typeof req.user.role !== 'string') {
        return next(new error_exceptions_1.UnauthorizedError('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
        return next(new error_exceptions_1.UnauthorizedError('Forbidden'));
    }
    next();
};
exports.requireRole = requireRole;
