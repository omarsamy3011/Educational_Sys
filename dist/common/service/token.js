"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_service_1 = require("../../config/env.service");
const error_exceptions_1 = require("../exceptions/error.exceptions");
const VALID_ROLES = new Set(['teacher', 'assistant', 'center', 'student', 'parent']);
class TokenService {
    constructor() { }
    normalizeRole(user) {
        const role = user?.role;
        if (typeof role === 'string' && VALID_ROLES.has(role)) {
            return role;
        }
        if (user?.email || user?.userName || user?.phone) {
            if (user?.teacher)
                return 'assistant';
            if (user?.center)
                return 'center';
            if (user?.userID)
                return 'student';
            if (user?.child)
                return 'parent';
        }
        return 'teacher';
    }
    normalizeAudience(audience) {
        if (Array.isArray(audience)) {
            return typeof audience[0] === 'string' ? audience[0] : 'teacher';
        }
        return typeof audience === 'string' ? audience : 'teacher';
    }
    resolveSignature(audience, isRefresh = false) {
        const normalized = String(audience ?? 'teacher').toLowerCase();
        if (normalized === 'teacher' || normalized === 'assistant' || normalized === 'student' || normalized === 'parent') {
            return isRefresh ? env_service_1.env.user_refresh_signature : env_service_1.env.user_signature;
        }
        if (normalized === 'center') {
            return isRefresh ? env_service_1.env.admin_refresh_signature : env_service_1.env.admin_signature;
        }
        if (normalized === 'admin' || normalized === 'user') {
            return isRefresh ? env_service_1.env.admin_refresh_signature : env_service_1.env.admin_signature;
        }
        return isRefresh ? env_service_1.env.user_refresh_signature : env_service_1.env.user_signature;
    }
    generateToken(user) {
        const role = this.normalizeRole(user);
        const signature = this.resolveSignature(role);
        const refreshSignature = this.resolveSignature(role, true);
        const subjectId = user?._id ?? user?.id;
        const accessToken = jsonwebtoken_1.default.sign({ id: subjectId, role }, signature, { audience: role, expiresIn: '30m' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: subjectId, role, tokenType: 'refresh' }, refreshSignature, { audience: role, expiresIn: '1y' });
        return { accessToken, refreshToken };
    }
    refreshAccessToken(refreshToken) {
        const payload = this.decodeRefreshToken(refreshToken);
        const audience = typeof payload.role === 'string' ? payload.role : this.normalizeAudience(payload.aud);
        const signature = this.resolveSignature(audience);
        const accessToken = jsonwebtoken_1.default.sign({ id: payload.id, role: audience }, signature, { audience: audience, expiresIn: '30m' });
        return { accessToken };
    }
    decodeToken(token) {
        let decodedtoken = jsonwebtoken_1.default.decode(token);
        if (!decodedtoken) {
            throw new error_exceptions_1.UnauthorizedError('Invalid token');
        }
        const audience = this.normalizeAudience(decodedtoken.aud ?? decodedtoken.role);
        const signature = this.resolveSignature(audience);
        try {
            const data = jsonwebtoken_1.default.verify(token, signature);
            return {
                ...data,
                role: typeof data.role === 'string' ? data.role : (typeof audience === 'string' ? audience : 'teacher')
            };
        }
        catch (error) {
            throw new error_exceptions_1.UnauthorizedError('Session expired or invalid token');
        }
    }
    decodeRefreshToken(refreshtoken) {
        const decodedToken = jsonwebtoken_1.default.decode(refreshtoken);
        if (!decodedToken ||
            decodedToken.tokenType !== 'refresh' ||
            (!VALID_ROLES.has(String(decodedToken.role ?? '')) && decodedToken.aud !== 'Admin' && decodedToken.aud !== 'User')) {
            throw new error_exceptions_1.UnauthorizedError('Invalid refresh token');
        }
        const audience = this.normalizeAudience(decodedToken.role ?? decodedToken.aud);
        const signature = this.resolveSignature(audience, true);
        try {
            return jsonwebtoken_1.default.verify(refreshtoken, signature);
        }
        catch (error) {
            throw new error_exceptions_1.UnauthorizedError('Invalid or expired refresh token');
        }
    }
}
exports.TokenService = TokenService;
