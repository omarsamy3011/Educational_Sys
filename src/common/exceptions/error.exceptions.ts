// import { GraphQLError } from "graphql"

interface AError {
    message:string,
    status:number,
    cause?:unknown
}

class ApplicationError extends Error implements AError {
    constructor(message:string,public status:number,cause?:unknown){
        super(message,{cause})
    }
}

// export const mapGraphQL = (error:ApplicationError)=>{
//     throw new GraphQLError(error.message,{extensions:{statusCode:error.status,cause:error.cause||{}}})
// }

export class BadRequestError extends ApplicationError {
    constructor(message:string,cause?:unknown){
        super(message,400,cause)
    }
}

export class NotFoundError extends ApplicationError {
    constructor(message:string,cause?:unknown){
        super(message,404,cause)
    }
}

export class ConflictError extends ApplicationError {
    constructor(message:string,cause?:unknown){
        super(message,409,cause)
    }
}