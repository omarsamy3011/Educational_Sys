import jwt, { JwtPayload } from 'jsonwebtoken'
import { env } from '../../config/env.service';
import { BadRequestError } from '../exceptions/error.exceptions';

export class TokenService {
    constructor(){}

    generateToken(user:any){
        let signature = undefined
        let audience = undefined
        let refreshSignature = undefined
        switch (user.role) {
            case 0:
                signature = env.user_signature
                audience = 'User'
                refreshSignature = env.user_refresh_signature
                break;
            default:
                signature = env.admin_signature
                audience = 'Admin'
                refreshSignature = env.admin_refresh_signature
                break;
        }        
        let accessToken = jwt.sign({id:user._id},signature as string,{audience,expiresIn:'30m'})
        let refreshToken = jwt.sign(
            { id: user._id, tokenType: "refresh" },
            refreshSignature as string,
            { audience, expiresIn: '1y' }
        )

        return {accessToken,refreshToken}
    }

    refreshAccessToken(refreshToken:string){
        const payload = this.decodeRefreshToken(refreshToken) as JwtPayload
        const signature = payload.aud === "Admin"
            ? env.admin_signature
            : env.user_signature
        const accessToken = jwt.sign(
            { id: payload.id },
            signature as string,
            { audience: payload.aud as string, expiresIn: '30m' }
        )
        return { accessToken }
    }

    decodeToken(token:string){
        let decodedtoken = jwt.decode(token) as JwtPayload
        if(!decodedtoken){
            throw new BadRequestError('invalid token')
        }
        let signature = undefined
        switch (decodedtoken.aud) {
            case "Admin":
                signature = env.admin_signature
                break;
            default:
                signature = env.user_signature
                break;
        }
        try {
            let data = jwt.verify(token,signature as string)
            return data
        } catch (error) {
            throw new BadRequestError('invalid token1')
        }
    }

    decodeRefreshToken(refreshtoken:string){
        const decodedToken = jwt.decode(refreshtoken) as JwtPayload | null
        if (
            !decodedToken ||
            decodedToken.tokenType !== "refresh" ||
            (decodedToken.aud !== "Admin" && decodedToken.aud !== "User")
        ) {
            throw new BadRequestError("Invalid refresh token")
        }

        const signature = decodedToken.aud === "Admin"
            ? env.admin_refresh_signature
            : env.user_refresh_signature
        try {
            return jwt.verify(refreshtoken, signature as string)
        } catch (error) {
            throw new BadRequestError("Invalid or expired refresh token", error)
        }
    }
}