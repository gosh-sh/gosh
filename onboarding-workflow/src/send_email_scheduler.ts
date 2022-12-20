import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { getDb } from './db/db.ts'
import { getEmailsNotSent } from './emails/emails.ts'
import { sendEmail } from './utils/email.ts'

dotenv.config({ export: true })

const mutex = new Mutex()

getDb()
    .channel('emails:not_sent')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails' },
        async (payload) => {
            console.log('INSERT emails', payload)
            await sendEmails()
        },
    )
    .subscribe()

sendEmails()

async function sendEmails() {
    const release = await mutex.acquire()
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
    release()
}
