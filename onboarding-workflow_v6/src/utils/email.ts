import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

const emailUsername = () => Deno.env.get('EMAIL_USERNAME') ?? ''
const emailPassword = () => Deno.env.get('EMAIL_PASSWORD') ?? ''
const emailFrom = () => Deno.env.get('EMAIL_FROM') ?? ''

type Email = {
    to: string
    subject: string
    content: string
    html?: string
}

export const sendEmail = async (email: Email) => {
    const smtpClient = new SmtpClient()

    await smtpClient.connectTLS({
        hostname: 'smtp.gmail.com',
        port: 465,
        username: emailUsername(),
        password: emailPassword(),
    })

    await smtpClient.send({
        from: emailFrom(), // Your Email address
        to: email.to, // Email address of the destination
        subject: email.subject,
        content: email.content,
        html: email.html,
    })

    await smtpClient.close()
}
