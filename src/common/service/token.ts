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
        let refreshToken = jwt.sign({id:user._id},signature as string,{audience,expiresIn:'1y'})

        return {accessToken,refreshToken}
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
        let decodedtoken = jwt.decode(refreshtoken) as JwtPayload
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
        let data = jwt.verify(refreshtoken,signature as string)
        return data
    }
}