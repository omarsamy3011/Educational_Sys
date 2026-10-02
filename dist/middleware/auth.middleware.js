"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const token_1 = require("../common/service/token");
const error_exceptions_1 = require("../common/exceptions/error.exceptions");
const tokenService = new token_1.TokenService();
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new error_exceptions_1.BadRequestError('no token sent'));
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
            return next(new error_exceptions_1.BadRequestError('invalid token format'));
        }
        const data = tokenService.decodeToken(token);
        if (!data) {
            return next(new error_exceptions_1.BadRequestError('session time expired'));
        }
        req.user = data;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.auth = auth;
