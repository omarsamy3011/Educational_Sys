import mongoose, { Types } from 'mongoose'
import {  genderEnum, gradeEnum, providerEnum } from '../../common/enum/user.enum'
import { IStudent } from '../../common/interface/stud'
import { teachingLanguageEnum } from '../../common/enum/subject.enum'

const studentSchema = new mongoose.Schema<IStudent>({
    firstName:String,
    lastName:String,
    userID:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        unique:true,
        required:true
    },
    parentPhone:String,
    password:String,
    confirmAccount:{
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
    grade:{
        type:String,
        enum:gradeEnum
    },
    schoolName:String,
    learningLanguage:{
        type:String,
        enum:teachingLanguageEnum
    },
    balance:{
        type:Number,
        default:0
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

studentSchema.virtual('userName').set(function(this,userName){
    let [firstName,lastName] = userName.split(' ')
    this.firstName = firstName
    this.lastName = lastName
}).get(function(this){
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
})

const studentModel = mongoose.model<IStudent>('Student',studentSchema)

export default studentModel