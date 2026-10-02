import { NextFunction, Request, Response } from "express";
import { TokenService } from "../common/service/token";
import { BadRequestError } from "../common/exceptions/error.exceptions";

const tokenService = new TokenService();

export interface userRequest extends Request {
    user?: any;
}

export const auth = (req: userRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next(new BadRequestError('no token sent'));
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
            return next(new BadRequestError('invalid token format'));
        }

        const data = tokenService.decodeToken(token);

        if (!data) {
            return next(new BadRequestError('session time expired'));
        }

        req.user = data;
        next();
    } catch (error) {
        next(error);
    }
};