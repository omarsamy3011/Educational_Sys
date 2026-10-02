import { NextFunction, Request, Response } from "express";


export const globalErrorHandling =(err:any,req:Request,res:Response,next:NextFunction)=>{
    return res.status(err.status || 500 ).json({
        message:err.message,
        stack:err.stack,
        cause:err.cause,
        err
    })
}