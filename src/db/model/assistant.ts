import mongoose, { Types } from 'mongoose'
import { assistantTypeEnum, genderEnum, providerEnum } from '../../common/enum/user.enum'
import { IAssistant } from '../../common/interface/assis'

const assistantSchema = new mongoose.Schema<IAssistant>({
    firstName:String,
    lastName:String,
    userName:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        unique:true,
        required:true
    },
    password:String,
    confirmEmail:{
        type:Boolean,
        default:false
    },
    profilepic:{
        type:String,
        required:false
    },
    gender: {
    type: String,
    enum: genderEnum,
    default: genderEnum.Male,
    },
    provider:{
        type:String,
        enum:providerEnum,
        default:providerEnum.System
    },
    role:{
        type:String,
        enum:assistantTypeEnum,
        default:assistantTypeEnum.Assistant
    },
    teacher:{
        type:Types.ObjectId,
        ref:'Teacher'
    },
    createdAt:{
        type:Date,
        default:Date.now()
    }
},{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    })

// assistantSchema.virtual('userName').set(function(this,userName){
//     let [firstName,lastName] = userName.split(' ')
//     this.firstName = firstName
//     this.lastName = lastName
// }).get(function(this){
//     return `${this.firstName || ''} ${this.lastName || ''}`.trim();
// })

const assistantModel = mongoose.model<IAssistant>('Assistant',assistantSchema)

export default assistantModel