import { Response, Router } from "express";
import { auth, userRequest } from "../../middleware/auth.middleware";
import { studentservice } from "./student.service";
import { successResponce } from "../../common/exceptions/successresponce";



const router = Router()

router.get('/profile', auth,async (req: userRequest, res: Response) => {
    const data = await studentservice.getMyProfile(req.user.id)
    successResponce ({res, message:"Profile fetched successfully" , data})
})

router.patch('/profile', auth,async (req: userRequest, res: Response) => {
    const data = await studentservice.updateMyProfile(req.user.id, req.body)
    successResponce ({res, message:"Profile updated successfully" , data})
})

router.get('/teachers', auth,async (req: userRequest, res: Response) => {
    const data = await studentservice.getMyTeachers(req.user.id)
    successResponce ({res, message:"Teachers fetched successfully" , data})
})

router.post('/teachers/:teacherId/request', auth,async (req: userRequest, res: Response) => {
    const data= await studentservice.sendRequestToTeacher(req.user.id, req.params.teacherId as string)
    successResponce ({res, message:"Request sent successfully" , data})
})

router.get('/teachers/:teacherId/overview', auth,async (req: userRequest, res: Response) => {
    const data = await studentservice.getTeacherOverview(req.user.id, req.params.teacherId as string)
    successResponce ({res, message:"Teacher overview fetched successfully" , data})
})

router.get('/teachers/:sessionId/sessions',auth,async(req:userRequest,res:Response)=>{
    const data = await studentservice.getTeacherSessions(req.user.id, req.params.sessionId as string)
    successResponce ({res, message:"Teacher sessions fetched successfully" , data})
})

export default router