import mongoose, { STATES, Types } from 'mongoose'
import { assistantTypeEnum, genderEnum, providerEnum } from '../../common/enum/user.enum'
import { ITeacher } from '../../common/interface/teacher'
import { subjectEnum, teachingLanguageEnum } from '../../common/enum/subject.enum'

const teacherSchema = new mongoose.Schema<ITeacher>({
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
    companyName:{
        type:String,
        unique:true
    },
    subject:{
        type:[String],
        enum:subjectEnum
    },
    teachingLanguage:{
        type:String,
        enum:teachingLanguageEnum
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    students:[{
        type:Types.ObjectId,
        ref:'Student'
    }],
    center:[{
        type:Types.ObjectId,
        ref:'Center'
    }]
},{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    })

teacherSchema.virtual('userName').set(function(this,userName){
    let [firstName,lastName] = userName.split(' ')
    this.firstName = firstName
    this.lastName = lastName
}).get(function(this){
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
})

const teacherModel = mongoose.model<ITeacher>('Teacher',teacherSchema)

export default teacherModel