import { NextFunction, Request, Response } from "express";

export const globalErrorHandling = (err: any, req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const payload: Record<string, unknown> = {
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