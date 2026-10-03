import express from "express"
import {Express} from "express"
import { env } from "./config/env.service"
import { dbconnection } from "./db/connection"
import { successResponce } from "./common/exceptions/successresponce"
import teacherAuthRouter from './module/auth/aurh.controller'
import path from "node:path"
import { globalErrorHandling } from "./middleware/errorHandling"
import cors from 'cors'
import { redisService } from "./common/service/redisService"

export const bootstrap = async() =>{
    const app :Express  = express()
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }))
    app.use(express.json())
    app.get('/check-health',async(req,res)=>{
        successResponce({res,message:'healthy'})
    })
    app.use(teacherAuthRouter)
    redisService.connectRedis()
    app.use(globalErrorHandling)
    app.use(express.static(path.resolve(__dirname, "../front-end")))
    dbconnection()
    app.listen(env.port , ()=>{
        console.log(`server is running on port ${env.port}`)
    })

}