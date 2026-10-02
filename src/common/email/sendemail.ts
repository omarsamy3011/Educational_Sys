import nodemailer from 'nodemailer'
import { env } from '../../config/env.service'
import Mail from 'nodemailer/lib/mailer'

const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:env.google_email,
        pass:env.google_app_password
    }
})

export const sendEmail = async ({to,subject,html}:Mail.Options)=>{
    const info = await transporter.sendMail({
        from:`social app managed by omar`,
        to,
        subject,
        html
    })
}