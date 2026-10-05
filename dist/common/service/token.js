"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_service_1 = require("../../config/env.service");
const error_exceptions_1 = require("../exceptions/error.exceptions");
class TokenService {
    constructor() { }
    generateToken(user) {
        let signature = undefined;
        let audience = undefined;
        let refreshSignature = undefined;
        switch (user.role) {
            case 0:
                signature = env_service_1.env.user_signature;
                audience = 'User';
                refreshSignature = env_service_1.env.user_refresh_signature;
                break;
            default:
                signature = env_service_1.env.admin_signature;
                audience = 'Admin';
                refreshSignature = env_service_1.env.admin_refresh_signature;
                break;
        }
        let accessToken = jsonwebtoken_1.default.sign({ id: user._id }, signature, { audience, expiresIn: '30m' });
        let refreshToken = jsonwebtoken_1.default.sign({ id: user._id, tokenType: "refresh" }, refreshSignature, { audience, expiresIn: '1y' });
        return { accessToken, refreshToken };
    }
    refreshAccessToken(refreshToken) {
        const payload = this.decodeRefreshToken(refreshToken);
        const signature = payload.aud === "Admin"
            ? env_service_1.env.admin_signature
            : env_service_1.env.user_signature;
        const accessToken = jsonwebtoken_1.default.sign({ id: payload.id }, signature, { audience: payload.aud, expiresIn: '30m' });
        return { accessToken };
    }
    decodeToken(token) {
        let decodedtoken = jsonwebtoken_1.default.decode(token);
        if (!decodedtoken) {
            throw new error_exceptions_1.BadRequestError('invalid token');
        }
        let signature = undefined;
        switch (decodedtoken.aud) {
            case "Admin":
                signature = env_service_1.env.admin_signature;
                break;
            default:
                signature = env_service_1.env.user_signature;
                break;
        }
        try {
            let data = jsonwebtoken_1.default.verify(token, signature);
            return data;
        }
        catch (error) {
            throw new error_exceptions_1.BadRequestError('invalid token1');
        }
    }
    decodeRefreshToken(refreshtoken) {
        const decodedToken = jsonwebtoken_1.default.decode(refreshtoken);
        if (!decodedToken ||
            decodedToken.tokenType !== "refresh" ||
            (decodedToken.aud !== "Admin" && decodedToken.aud !== "User")) {
            throw new error_exceptions_1.BadRequestError("Invalid refresh token");
        }
        const signature = decodedToken.aud === "Admin"
            ? env_service_1.env.admin_refresh_signature
            : env_service_1.env.user_refresh_signature;
        try {
            return jsonwebtoken_1.default.verify(refreshtoken, signature);
        }
        catch (error) {
            throw new error_exceptions_1.BadRequestError("Invalid or expired refresh token", error);
        }
    }
}
exports.TokenService = TokenService;
