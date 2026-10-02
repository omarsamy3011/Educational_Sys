import express from "express"
import {Express} from "express"
import { env } from "./config/env.service"
import { dbconnection } from "./db/connection"
import { successResponce } from "./common/exceptions/successresponce"
import teacherAuthRouter from './module/auth/aurh.controller'

export const bootstrap = async() =>{
    const app :Express  = express()
    app.use(express.json())
    app.use(teacherAuthRouter)
    app.get('/check-health',async(req,res)=>{
        successResponce({res,message:'healthy'})
    })
    dbconnection()
    app.listen(env.port , ()=>{
        console.log(`server is running on port ${env.port}`)
    })

}