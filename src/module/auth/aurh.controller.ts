import { Router, type Request, type Response } from "express";
import authService from "./auth.service";
import { successResponce } from "../../common/exceptions/successresponce";
import { auth, userRequest } from "../../middleware/auth.middleware";
import { validation } from "../../common/service/validation";
import { MulterStorageEnums } from "../../common/enum/multer.enum";
import { uploadFile } from "../../common/service/multer/cloud";


const router:Router = Router()

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