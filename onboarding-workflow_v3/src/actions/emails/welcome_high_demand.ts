import nunjucks from 'npm:nunjucks'
import { getDb, User } from '../../db/db.ts'
import { INTENT_WELCOME_HIGH_DEMAND } from './constants.ts'

const EMAIL_SUBJECT = 'Hello and Welcome'
const EMAIL_HTML_FILE = 'emails/welcome_high_demand.html.template'
const EMAIL_TEXT_FILE = 'emails/welcome_high_demand.text.template'

export async function emailWelcomeHighDemand(user: User) {
    if (!user.email) {
        const err_message = `Error: User ${user} has no email`
        console.log(err_message)
        throw new Error(err_message)
    }

    const mail_to = user.email.trim()
    const mail_html = nunjucks.render(EMAIL_HTML_FILE)
    const mail_text = nunjucks.render(EMAIL_TEXT_FILE)

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
        await getDb()
            .from('emails')
            .insert({
                mail_to: mail_to,
                subject: EMAIL_SUBJECT,
                content: mail_text,
                html: mail_html,
                intent: INTENT_WELCOME_HIGH_DEMAND,
            })
            .then((res): void => {
                console.log(`Email insert:`, res)
            })
    }
}
