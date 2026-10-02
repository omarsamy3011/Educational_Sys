import { email } from "zod"
import { sendEmail } from "../../common/email/sendemail"
import { BadRequestError, NotFoundError } from "../../common/exceptions/error.exceptions"
import { compareHash, genertateHash } from "../../common/security/security"
import { redisService } from "../../common/service/redisService"
import { TokenService } from "../../common/service/token"
import crypto from 'crypto'
import { DatabaseReposatory } from "../../db/repository/db.repo"
import { MulterStorageEnums } from "../../common/enum/multer.enum"
import { IAssistant } from "../../common/interface/assis"
import assistantModel from "../../db/model/assistant"
import { ICenter } from "../../common/interface/center"
import centerModel from "../../db/model/center"
import { IParent } from "../../common/interface/parent"
import parentModel from "../../db/model/parent"
import { IStudent } from "../../common/interface/stud"
import studentModel from "../../db/model/student"
import { ITeacher } from "../../common/interface/teacher"
import teacherModel from "../../db/model/teacher"


class AuthService {
    private assisReposatory :DatabaseReposatory<IAssistant>
    private centerRepository : DatabaseReposatory<ICenter>
    private parentRepository : DatabaseReposatory<IParent>
    private studentRepository : DatabaseReposatory<IStudent>
    private teacherRepository : DatabaseReposatory<ITeacher>
    private tokenService : TokenService
    constructor(){
        this.assisReposatory = new DatabaseReposatory(assistantModel)
        this.centerRepository = new DatabaseReposatory(centerModel)
        this.parentRepository = new DatabaseReposatory(parentModel)
        this.studentRepository = new DatabaseReposatory(studentModel)
        this.teacherRepository = new DatabaseReposatory(teacherModel)
        this.tokenService = new TokenService()
    }

    async teacherSignup(data:ITeacher,file:Express.Multer.File){
        let existingTeacher = await this.teacherRepository.findone({filter:{
        $or: [
        { email:data.email },
        { phone:data.phone },
        { userName:data.userName },
        ...(data.companyName ? [{ companyName:data.companyName }] : []),
        ],
    }})
        if(existingTeacher){
            if (existingTeacher.email === email) throw new BadRequestError('Email already registered');
            if (existingTeacher.phone === data.phone) throw new BadRequestError('Phone number already registered');
            if (existingTeacher.userName === data.userName) throw new BadRequestError('Username already taken');
            if (data.companyName && existingTeacher.companyName === data.companyName)throw new BadRequestError('Company name already taken')
        }
        let hashedpass = await genertateHash({plainText:data.password})
        data.password = hashedpass
        let picture 
        // if(file){
        //     let picURL = await s3service.uploadFile({file,memoryStorage:MulterStorageEnums.diskStorage})
        //     picture.push(picURL)
        // }
        //data.profilepic = picture
        const otp = crypto.randomInt(100000, 1000000).toString()
        try {
            await sendEmail({
            to:`${data.email}`,
            subject:`Verify Your Account Please`,
            html:`<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 40px 10px;">
        <tr>
        <td align="center">
            <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); padding: 30px;">
            
            <!-- Header / Brand -->
            <tr>
                <td align="center" style="padding-bottom: 20px;">
                <h2 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">Verification Code</h2>
                </td>
            </tr>

            <!-- Content -->
            <tr>
                <td align="center" style="color: #555555; font-size: 15px; line-height: 1.5; padding-bottom: 25px;">
                Please use the one-time verification code below to complete your login. This code is valid for <strong>5 minutes</strong>.
                </td>
            </tr>

            <!-- OTP Box -->
            <tr>
                <td align="center" style="padding-bottom: 25px;">
                <div style="display: inline-block; background-color: #f0f4ff; border: 1px dashed #4f46e5; border-radius: 8px; padding: 15px 35px;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;"><!-- OTP_CODE_HERE -->${otp}</span>
                </div>
                </td>
            </tr>

            <!-- Security Note -->
            <tr>
                <td align="center" style="color: #888888; font-size: 13px; line-height: 1.4;">
                If you didn't request this code, you can safely ignore this email. Someone might have typed your address by mistake.
                </td>
            </tr>

            <!-- Divider -->
            <tr>
                <td style="padding-top: 25px; border-bottom: 1px solid #eeeeee;"></td>
            </tr>

            <!-- Footer -->
            <tr>
                <td align="center" style="padding-top: 20px; color: #aaaaaa; font-size: 12px;">
                &copy; 2026 Your App Name. All rights reserved.
                </td>
            </tr>

            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>`
        })
        } catch (error) {
            throw new BadRequestError('No Email Sent Try Again !!')
        }
        redisService.set({key:`otp::${data.email}`,value:`${await genertateHash({plainText:otp})}`,ttl:60*5})
        return await this.teacherRepository.create(data)
    }

    async teacherLogin(data:any){
        let { identifier , password } = data
        let teacherData = await this.teacherRepository.findone({filter:{
        $or: [{ email: identifier }, { phone: identifier }, { userName: identifier }],
    }})
    if(teacherData.confirmEmail){
        if(teacherData){
            let isMatched = await compareHash({plainText:password,cypherText:teacherData.password})
            if(isMatched){
                return this.tokenService.generateToken(teacherData)
            }else{
                throw new BadRequestError('password invalid')
            }
        }else{
            throw new NotFoundError('Teacher Account Not Found')
        }
    }else{
        throw new BadRequestError('Account Is Not Verified')
    }
    }

    // async gets3url(name:string){
    //     return await s3service.GetPreSignURL({Originalname:name})
    // }

    async teacherVerify(data:any){
        let identifier = data.identifier
        let teacherData = await this.teacherRepository.findone({filter:{
        $or: [{ email: identifier }, { phone: identifier }, { userName: identifier }],
    }})
        if(teacherData.confirmEmail){
            throw new BadRequestError('teacher is already verified')
        }
        let hashedotp = await redisService.get({key:`otp::${teacherData.email}`})
        if(!hashedotp){
            throw new BadRequestError('OTP Expired , Click To Resend')
        }
        let matchedotp = await compareHash({plainText:data.otp,cypherText:hashedotp as string})
        if(matchedotp){
            return await this.teacherRepository.updateone({filter:{email:teacherData.email},data:{confirmEmail:true}})
        }else{
            throw new BadRequestError('OTP is not correct')
        }
    }
}

export default new AuthService