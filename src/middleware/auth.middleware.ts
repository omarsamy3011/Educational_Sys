import { NextFunction, Request, Response } from "express";
import { TokenService } from "../common/service/token";
import { UnauthorizedError } from "../common/exceptions/error.exceptions";

const tokenService = new TokenService();

export interface userRequest extends Request {
    user?: any;
}

export const auth = (req: userRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next(new UnauthorizedError('No token sent'));
        }

        // Handle both "Bearer <token>" and raw token strings safely
        const parts = authHeader.split(' ');
        let token = '';

        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1] as string;
        } else if (parts.length === 1) {
            token = parts[0] as string;
        }
        
        if (!token) {
            return next(new UnauthorizedError('Invalid token format'));
        }

        const data = tokenService.decodeToken(token);
        req.user = data;
        next();
    } catch (error) {
        next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid or expired token'));
    }
};

export const requireRole = (allowedRoles: string[]) => (req: userRequest, res: Response, next: NextFunction) => {
    if (!req.user || typeof req.user.role !== 'string') {
        return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
        return next(new UnauthorizedError('Forbidden'));
    }

    next();
};