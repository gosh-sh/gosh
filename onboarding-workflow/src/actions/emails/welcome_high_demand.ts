import { getDb, User } from '../../db/db.ts'
import { INTENT_WELCOME_HIGH_DEMAND } from './constants.ts'

const EMAIL_SUBJECT = 'Hello and Welcome'
const EMAIL_HTML_FILE = 'emails/welcome_high_demand.html'
const EMAIL_TEXT = `\
Thank you for joining GOSH

Due to very high demand we would like to ask you to wait
while your repositories migrate, the process could take a couple of hours
— we will notify you once they are ready so that you can get to work

Kindly,
The GOSH team
`

export async function emailWelcomeHighDemand(user: User) {
    if (!user.email) {
        const err_message = `Error: User ${user} has no email`
        console.log(err_message)
        throw new Error(err_message)
    }

    const mail_to = user.email.trim()

    // TODO: should be done via DB constraint
    // deduplicate
    const { data: emails, error } = await getDb()
        .from('emails')
        .select()
        .eq('intent', INTENT_WELCOME_HIGH_DEMAND)
        .eq('mail_to', mail_to)

    console.log(`Emails: ${emails}`)

    if (error) {
        console.log(`DB error`, error)
        throw new Error(error.message)
    }

    if (emails.length === 0) {
        console.log(`Try create ${INTENT_WELCOME_HIGH_DEMAND} email ${mail_to}`)
        const mail_html = new TextDecoder().decode(Deno.readFileSync(EMAIL_HTML_FILE))
        await getDb()
            .from('emails')
            .insert({
                mail_to: mail_to,
                subject: EMAIL_SUBJECT,
                content: EMAIL_TEXT,
                html: mail_html,
                intent: INTENT_WELCOME_HIGH_DEMAND,
            })
            .then((res): void => {
                console.log(`Email insert:`, res)
            })
    }
}
