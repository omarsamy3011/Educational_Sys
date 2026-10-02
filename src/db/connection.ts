import mongoose from "mongoose"
import { env } from "../config/env.service"


export const dbconnection=()=>{
    mongoose.connect(env.dataBase_url as string,{
        dbName:env.db_name as string
    })
    .then(()=>{console.log("database connected")})
    .catch((err)=>console.log(err))
}
