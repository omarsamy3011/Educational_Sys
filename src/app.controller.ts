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
import { centerService } from "./module/center/center.service"
import teacherService from "./module/teacher/teacher.service"
import path from "node:path"
import { globalErrorHandling } from "./middleware/errorHandling"
import cors from 'cors'
import { redisService } from "./common/service/redisService"
import os from 'os'


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
    app.get("/centers/search", async (req, res) => {
        const query = typeof req.query.q === "string" ? req.query.q : undefined
        const data = await centerService.searchCenters(query)
        successResponce({ res, message: "Centers searched successfully", data })
    })
    app.get("/teachers/search", async (req, res) => {
        const query = typeof req.query.q === "string" ? req.query.q : undefined
        const data = await teacherService.searchTeachers(query)
        successResponce({ res, message: "Teachers searched successfully", data })
    })
    app.use(AuthRouter)
    app.use('/teacher',TeacherRouter)
    app.use('/teacher',SessionRouter)
    app.use('/center', centerRouter)
    app.use('/student', studentRouter)
    redisService.connectRedis()
    app.use('/vendor', express.static(path.resolve(__dirname, "../node_modules/jsqr/dist")))
    app.use(globalErrorHandling)
    app.use(express.static(path.resolve(__dirname, "../front-end")))
    dbconnection()
    app.listen(env.port , ()=>{
        console.log(`server is running on port ${env.port}`)
        console.log(`connect on the http://${Object.values(os.networkInterfaces() as object)[0][1].address}:${env.port}`)
    })
}