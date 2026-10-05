import { Router, Response } from "express"
import { Types } from "mongoose"
import { BadRequestError } from "../../common/exceptions/error.exceptions"
import { successResponce } from "../../common/exceptions/successresponce"
import { auth, userRequest } from "../../middleware/auth.middleware"
import sessionService from "./session.service"
import {
    createSessionSchema,
    markAttendanceSchema,
    setSessionActiveSchema
} from "./session.validation"

const router = Router()

const getTeacherId = (req: userRequest): string => {
    if (typeof req.user?.id !== "string") {
        throw new BadRequestError("Invalid authenticated user")
    }
    return req.user.id
}

const getSessionId = (req: userRequest): string => {
    const { sessionId } = req.params
    if (typeof sessionId !== "string" || !Types.ObjectId.isValid(sessionId)) {
        throw new BadRequestError("Invalid session id")
    }
    return sessionId
}

router.get("/sessions", auth, async (req: userRequest, res: Response) => {
    const data = await sessionService.getSessions(getTeacherId(req))
    successResponce({ res, message: "Sessions retrieved successfully", data })
})

router.post("/sessions", auth, async (req: userRequest, res: Response) => {
    const parsed = createSessionSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new BadRequestError("Invalid session data", parsed.error.issues)
    }
    const data = await sessionService.createSession(getTeacherId(req), parsed.data)
    successResponce({ res, message: "Session created successfully", status: 201, data })
})

router.patch("/sessions/:sessionId/active", auth, async (req: userRequest, res: Response) => {
    const parsed = setSessionActiveSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new BadRequestError("Invalid session state", parsed.error.issues)
    }
    const data = await sessionService.setSessionActive(
        getTeacherId(req),
        getSessionId(req),
        parsed.data.active
    )
    successResponce({ res, message: "Session state updated successfully", data })
})

router.post("/sessions/:sessionId/attendance", auth, async (req: userRequest, res: Response) => {
    const parsed = markAttendanceSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new BadRequestError("Invalid attendance data", parsed.error.issues)
    }
    const data = await sessionService.markAttendance(
        getTeacherId(req),
        getSessionId(req),
        parsed.data.identifier
    )
    successResponce({ res, message: "Attendance recorded successfully", status: 201, data })
})

export default router
