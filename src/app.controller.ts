import express from "express"
import {Express} from "express"
import { env } from "./config/env.service"
import { dbconnection } from "./db/connection"
import { successResponce } from "./common/exceptions/successresponce"
import AuthRouter from './module/auth/aurh.controller'
import TeacherRouter from './module/teacher/teacher.controller'
import SessionRouter from './module/session/session.controller'
import centerRouter from './module/center/center.controller'
import studentRouter from './module/student/student.controller'
import path from "node:path"
import { globalErrorHandling } from "./middleware/errorHandling"
import cors from 'cors'
import { redisService } from "./common/service/redisService"
import os from 'os'
import { readFileSync } from "node:fs"
import https from 'https'


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

    app.use(AuthRouter)
    app.use('/teacher',TeacherRouter)
    app.use('/session',SessionRouter)
    app.use('/center', centerRouter)
    app.use('/student', studentRouter)
    redisService.connectRedis()
    app.use('/vendor', express.static(path.resolve(__dirname, "../node_modules/jsqr/dist")))
    app.use(globalErrorHandling)
    app.use(express.static(path.resolve(__dirname, "../front-end")))
    dbconnection()

    const options = {
        key:readFileSync('cert.key'),
        cert:readFileSync('cert.crt')
    }
    https.createServer(options,app).listen(Number(env.port),"0.0.0.0",()=>{
        console.log(`server is running on port ${env.port}`)
        console.log(`connect on the https://${os.networkInterfaces()['Wi-Fi']?.pop()?.address}:${env.port}`)
    })

    // app.listen(env.port , ()=>{
    //     console.log(`server is running on port ${env.port}`)
    //     console.log(`connect on the http://${Object.values(os.networkInterfaces() as object)[0][1].address}:${env.port}`)
    // })
}