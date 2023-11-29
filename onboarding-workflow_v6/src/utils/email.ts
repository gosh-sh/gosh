import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts'

const emailUsername = () => Deno.env.get('EMAIL_USERNAME') ?? ''
const emailPassword = () => Deno.env.get('EMAIL_PASSWORD') ?? ''
const emailFrom = () => Deno.env.get('EMAIL_FROM') ?? ''

type Email = {
    to: string
    subject: string
    content: string
    html?: string
    attachments?: {
        content: any
        filename: string
        encoding: string
        contentType: string
    }[]
}

export const sendEmail = async (email: Email) => {
    const smtpClient = new SMTPClient({
        connection: {
            hostname: 'smtp.gmail.com',
            port: 465,
            tls: true,
            auth: {
                username: emailUsername(),
                password: emailPassword(),
            },
        },
    })

    await smtpClient.send({
        from: emailFrom(), // Your Email address
        to: email.to, // Email address of the destination
        subject: email.subject,
        content: email.content,
        html: email.html,
        attachments: email.attachments,
    })

    await smtpClient.close()
}
