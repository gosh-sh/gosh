import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { getDb } from '../db/db.ts'
import { getEmailsNotSent } from '../db/emails.ts'
import { sendEmail } from '../utils/email.ts'

while (true) {
    await sendEmails()
    await sleep(10)
}

async function sendEmails() {
    try {
        const emails = await getEmailsNotSent()
        console.log('Emails', emails)

        for (const email of emails) {
            console.log('About to send email', email)

            if (!email.mail_to) {
                console.error('Email with empty mail_to', email)
                continue
            }

            await sendEmail({
                to: email.mail_to,
                subject: email.subject,
                content: email.content,
                html: email.html,
                attachments: email.attachments,
            })

            await getDb()
                .from('emails')
                .update({
                    sent_at: new Date().toISOString(),
                })
                .eq('id', email.id)
        }
    } catch (err) {
        console.error(err)
    }
}
