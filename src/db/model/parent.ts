import mongoose, { Types } from 'mongoose'
import { assistantTypeEnum, genderEnum, providerEnum } from '../../common/enum/user.enum'
import { IParent } from '../../common/interface/parent'

const parentSchema = new mongoose.Schema<IParent>({
    phone:{
        type:String,
        unique:true,
        required:true
    },
    password:String,
    confirmAccount:{
        type:Boolean,
        default:false
    },
    gender: {
    type: String,
    enum: genderEnum,
    default: genderEnum.Male,
    },
    child:[{
        type:Types.ObjectId,
        ref:'Student'
    }],
    createdAt:{
        type:Date,
        default:Date.now()
    }
},{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    })



const parentModel = mongoose.model<IParent>('Parent',parentSchema)

export default parentModel