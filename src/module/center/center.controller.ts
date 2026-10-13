import { Response, Router } from "express";
import { Types } from "mongoose";
import { BadRequestError } from "../../common/exceptions/error.exceptions";
import { successResponce } from "../../common/exceptions/successresponce";
import { auth, userRequest } from "../../middleware/auth.middleware";
import { centerService } from "./center.service";
import {
    answerCenterTeacherSchema,
    changeCenterPasswordSchema,
    inviteCenterTeacherSchema,
    updateCenterProfileSchema
} from "./center.validation";

const router = Router();

const getCenterId = (req: userRequest): string => {
    if (typeof req.user?.id !== "string") {
        throw new BadRequestError("Invalid authenticated center")
    }
    return req.user.id;
};

router.get("/profile", auth, async (req: userRequest, res: Response) => {
    const data = await centerService.getMyProfile(getCenterId(req));
    successResponce({ res, message: "Center profile retrieved successfully", data })
});

router.patch("/profile", auth, async (req: userRequest, res: Response) => {
    const parsed = updateCenterProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid center profile data", parsed.error.issues);
    }
    const data = await centerService.updateMyProfile(getCenterId(req), parsed.data);
    successResponce({ res, message: "Center profile updated successfully", data })
})

router.patch("/password", auth, async (req: userRequest, res: Response) => {
    const parsed = changeCenterPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid password change data", parsed.error.issues);
    }
    const data = await centerService.changePassword(
        getCenterId(req),
        parsed.data.currentPassword,
        parsed.data.newPassword
    );
    successResponce({ res, message: "Center password updated successfully", data })
})

router.get('/dashboard', auth, async (req: userRequest, res: Response) => {
    const data = await centerService.getDashboardData(getCenterId(req));
    successResponce({ res, message: "Center dashboard data retrieved successfully", data })
})

router.get("/teachers", auth, async (req: userRequest, res: Response) => {
    const data = await centerService.getCenterTeachers(getCenterId(req));
    successResponce({ res, message: "Center teachers retrieved successfully", data })
})

router.post("/teachers/invite", auth, async (req: userRequest, res: Response) => {
    const parsed = inviteCenterTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid teacher invitation", parsed.error.issues);
    }
    const data = await centerService.inviteTeacher(getCenterId(req), parsed.data.identifier);
    successResponce({ res, message: "Teacher invitation sent successfully", data })
})

router.patch("/teachers/:teacherId", auth, async (req: userRequest, res: Response) => {
    const teacherId = Array.isArray(req.params.teacherId) ? req.params.teacherId[0] : req.params.teacherId;
    if (!teacherId || !Types.ObjectId.isValid(teacherId)) {
        throw new BadRequestError("Invalid teacher id")
    }
    const parsed = answerCenterTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new BadRequestError("Invalid teacher request status", parsed.error.issues);
    }
    const data = await centerService.answerTeacherRequest(getCenterId(req), teacherId, parsed.data.status);
    successResponce({ res, message: `Teacher request ${parsed.data.status === "active" ? "accepted" : "rejected"} successfully`, data })
})

router.delete("/teachers/:teacherId", auth, async (req: userRequest, res: Response) => {
    const teacherId = Array.isArray(req.params.teacherId) ? req.params.teacherId[0] : req.params.teacherId;
    if (!teacherId || !Types.ObjectId.isValid(teacherId)) {
        throw new BadRequestError("Invalid teacher id")
    }
    const data = await centerService.removeTeacher(getCenterId(req), teacherId);
    successResponce({ res, message: "Teacher removed from center successfully", data })
})

router.get("/schedule", auth, async (req: userRequest, res: Response) => {
    const data = await centerService.getCenterSchedule(getCenterId(req));
    successResponce({ res, message: "Center schedule retrieved successfully", data })
})

router.get("/sessions", auth, async (req: userRequest, res: Response) => {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const data = await centerService.getCenterSessions(getCenterId(req), from, to);
    successResponce({ res, message: "Center sessions retrieved successfully", data })
})

router.get("/search", async (req: userRequest, res: Response) => {
    const query = typeof req.query.q === "string" ? req.query.q : undefined;
    const data = await centerService.searchCenters(query);
    successResponce({ res, message: "Centers searched successfully", data })
})

router.get("/requests", auth, async (req: userRequest, res: Response) => {
    const data = await centerService.getPendingRequests(getCenterId(req));
    successResponce({ res, message: "Pending center join requests retrieved successfully", data })
})

router.patch("/requests/:requestId/:action", auth, async (req: userRequest, res: Response) => {
    const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
    const action = Array.isArray(req.params.action) ? req.params.action[0] : req.params.action;

    if (!requestId || !Types.ObjectId.isValid(requestId)) {
        throw new BadRequestError("Invalid request id")
    }
    if (!action || !['accept', 'reject'].includes(action)) {
        throw new BadRequestError("Action must be either accept or reject")
    }

    const data = await centerService.decideRequest(getCenterId(req), requestId, action as "accept" | "reject");
    successResponce({ res, message: `Request ${action}ed successfully`, data })
})

export default router;