import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { BadRequestError } from "../exceptions/error.exceptions";


type validationkey = keyof Request
type validationSchema = Partial<Record<validationkey,ZodType>>

export const validation = (schema:validationSchema)=>{

    return (req:Request,res:Response,next:NextFunction)=>{
        let validationErrors :object[]= []
        for (const key of Object.keys(schema) as validationkey[]) {
            if(!schema[key]){
                throw new BadRequestError("Validation error");
            }
            const result = schema[key].safeParse(req[key])
            if(!result.success){
                validationErrors.push({key,issue:result.error.issues})
            }
            if(validationErrors.length>0){
                throw new BadRequestError('validation error',validationErrors)
            }
            next()
        }
    }
}


// export const graphQLValidation = (schema:ZodType,args:any)=>{
//     let result = schema.safeParse(args)
//     let errors = []
//     if(!result.success){
//         errors.push(result.error.issues)
//         throw mapGraphQL(new BadRequestError('invalid validation',{error:errors}))
//     }
//     return true
// }