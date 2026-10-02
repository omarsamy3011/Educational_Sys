import mongoose from "mongoose";
import { ICenter } from "../../common/interface/center";



const centerSchema = new mongoose.Schema<ICenter>({
    name:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String
    },
    phone:{
        type:String,
        unique:true,
        required:true
    },
    textlocation:String,
    Maplocation:String,
    localphone:String
},{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})


const centerModel = mongoose.model<ICenter>('Center',centerSchema)

export default centerModel