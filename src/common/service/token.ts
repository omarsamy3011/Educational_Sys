import jwt, { JwtPayload } from 'jsonwebtoken'
import { env } from '../../config/env.service';
import { UnauthorizedError } from '../exceptions/error.exceptions';

const VALID_ROLES = new Set(['teacher', 'assistant', 'center', 'student', 'parent'])

export class TokenService {
    constructor(){}

    private normalizeRole(user: any): string {
        const role = user?.role
        if (typeof role === 'string' && VALID_ROLES.has(role)) {
            return role
        }

        if (user?.email || user?.userName || user?.phone) {
            if (user?.teacher) return 'assistant'
            if (user?.center) return 'center'
            if (user?.userID) return 'student'
            if (user?.child) return 'parent'
        }

        return 'teacher'
    }

    private normalizeAudience(audience: unknown): string {
        if (Array.isArray(audience)) {
            return typeof audience[0] === 'string' ? audience[0] : 'teacher'
        }
        return typeof audience === 'string' ? audience : 'teacher'
    }

    private resolveSignature(audience: string | undefined, isRefresh = false) {
        const normalized = String(audience ?? 'teacher').toLowerCase()
        if (normalized === 'teacher' || normalized === 'assistant' || normalized === 'student' || normalized === 'parent') {
            return isRefresh ? env.user_refresh_signature : env.user_signature
        }
        if (normalized === 'center') {
            return isRefresh ? env.admin_refresh_signature : env.admin_signature
        }
        if (normalized === 'admin' || normalized === 'user') {
            return isRefresh ? env.admin_refresh_signature : env.admin_signature
        }
        return isRefresh ? env.user_refresh_signature : env.user_signature
    }

    generateToken(user:any){
        const role = this.normalizeRole(user)
        const signature = this.resolveSignature(role)
        const refreshSignature = this.resolveSignature(role, true)
        const subjectId = user?._id ?? user?.id

        const accessToken = jwt.sign({ id: subjectId, role }, signature as string, { audience: role, expiresIn: '30m' })
        const refreshToken = jwt.sign(
            { id: subjectId, role, tokenType: 'refresh' },
            refreshSignature as string,
            { audience: role, expiresIn: '1y' }
        )

        return { accessToken, refreshToken }
    }

    refreshAccessToken(refreshToken:string){
        const payload = this.decodeRefreshToken(refreshToken) as JwtPayload
        const audience = typeof payload.role === 'string' ? payload.role : this.normalizeAudience(payload.aud)
        const signature = this.resolveSignature(audience)
        const accessToken = jwt.sign(
            { id: payload.id, role: audience },
            signature as string,
            { audience: audience as string, expiresIn: '30m' }
        )
        return { accessToken }
    }

    decodeToken(token:string){
        let decodedtoken = jwt.decode(token) as JwtPayload | null
        if (!decodedtoken) {
            throw new UnauthorizedError('Invalid token')
        }

        const audience = this.normalizeAudience(decodedtoken.aud ?? decodedtoken.role)
        const signature = this.resolveSignature(audience)

        try {
            const data = jwt.verify(token, signature as string) as JwtPayload
            return {
                ...data,
                role: typeof data.role === 'string' ? data.role : (typeof audience === 'string' ? audience : 'teacher')
            }
        } catch (error) {
            throw new UnauthorizedError('Session expired or invalid token')
        }
    }

    decodeRefreshToken(refreshtoken:string){
        const decodedToken = jwt.decode(refreshtoken) as JwtPayload | null
        if (
            !decodedToken ||
            decodedToken.tokenType !== 'refresh' ||
            (!VALID_ROLES.has(String(decodedToken.role ?? '')) && decodedToken.aud !== 'Admin' && decodedToken.aud !== 'User')
        ) {
            throw new UnauthorizedError('Invalid refresh token')
        }

        const audience = this.normalizeAudience(decodedToken.role ?? decodedToken.aud)
        const signature = this.resolveSignature(audience, true)
        try {
            return jwt.verify(refreshtoken, signature as string)
        } catch (error) {
            throw new UnauthorizedError('Invalid or expired refresh token')
        }
    }
}