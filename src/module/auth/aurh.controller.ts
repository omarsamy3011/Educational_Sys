import { Router, type Request, type Response } from "express";
import authService from "./auth.service";
import { successResponce } from "../../common/exceptions/successresponce";
import { auth, userRequest } from "../../middleware/auth.middleware";
import { BadRequestError } from "../../common/exceptions/error.exceptions"
import { validation } from "../../common/service/validation";
import { MulterStorageEnums } from "../../common/enum/multer.enum";
import { uploadFile } from "../../common/service/multer/cloud";
import { z } from "zod"


const router:Router = Router()
const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1).max(4096)
})

router.post('/signup/teacher', uploadFile({storageType:MulterStorageEnums.diskStorage}).single('file'),async (req:Request,res:Response)=>{
    let data = await authService.teacherSignup(req.body,req.file as Express.Multer.File)
    successResponce({res,message:'signned up successfully',data:data})
})
router.post('/signup/student', uploadFile({storageType:MulterStorageEnums.diskStorage}).single('file'),async (req:Request,res:Response)=>{
    let data = await authService.studentSignup(req.body,req.file as Express.Multer.File)
    successResponce({res,message:'signned up successfully',data:data})
})
router.post('/signup/center', uploadFile({storageType:MulterStorageEnums.diskStorage}).single('file'),async (req:Request,res:Response)=>{
    let data = await authService.centerSignup(req.body,req.file as Express.Multer.File)
    successResponce({res,message:'signned up successfully',data:data})
})

router.post('/login/teacher',async (req:Request,res:Response)=>{
    let data = await authService.teacherLogin(req.body)
    successResponce({res,message:'logged in successfully',data:data})
})
router.post('/login/student',async (req:Request,res:Response)=>{
    let data = await authService.studentLogin(req.body)
    successResponce({res,message:'logged in successfully',data:data})
})
router.post('/login/center',async (req:Request,res:Response)=>{
    let data = await authService.centerLogin(req.body)
    successResponce({res,message:'logged in successfully',data:data})
})

router.post('/refresh-token',async (req:Request,res:Response)=>{
    const parsed = refreshTokenSchema.safeParse(req.body)
    if(!parsed.success){
        throw new BadRequestError("Invalid refresh token request",parsed.error.issues)
    }
    const data = authService.refreshToken(parsed.data.refreshToken)
    successResponce({res,message:'access token refreshed successfully',data})
})

router.post('/verify-acc',async (req:Request,res:Response)=>{
    let data = await authService.teacherVerify(req.body)
    successResponce({res,message:'account veryfied successfully',data:data})
})

// router.post('/verify' ,auth,checkRole(['1','0']),async(req:userRequest,res:Response)=>{
//     // console.log(req.user)
    
//     // let data = await authService.login(req.body)
//     successResponce({res,message:'logged in successfully'})
// })

export default router