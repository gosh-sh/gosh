import nunjucks from 'npm:nunjucks'
import { getDb, User } from '../../db/db.ts'
import { INTENT_ONBOARDING_RENAME } from './constants.ts'

const EMAIL_SUBJECT = 'Houston, we have a problem!'
const EMAIL_HTML_FILE = 'emails/onboarding_rename.html'
const EMAIL_TEXT_FILE = 'emails/onboarding_rename.txt'

export async function emailOnboardingRename(user: User) {
    if (!user.email) {
        const err_message = `Error: User ${user} has no email`
        console.log(err_message)
        throw new Error(err_message)
    }

    const mail_to = user.email.trim()
    const mail_html = nunjucks.render(EMAIL_HTML_FILE)
    const mail_text = nunjucks.render(EMAIL_TEXT_FILE)

    // TODO: should be done via DB constraint
    const { data: emails, error } = await getDb()
        .from('emails')
        .select()
        .eq('intent', INTENT_ONBOARDING_RENAME)
        .eq('mail_to', mail_to)

    console.log(`Emails: ${emails}`)

    if (error) {
        console.log(`DB error`, error)
        throw new Error(error.message)
    }

    if (emails.length === 0) {
        console.log(`Try create ${INTENT_ONBOARDING_RENAME} email ${mail_to}`)
        await getDb()
            .from('emails')
            .insert({
                mail_to: mail_to,
                subject: EMAIL_SUBJECT,
                content: mail_text,
                html: mail_html,
                intent: INTENT_ONBOARDING_RENAME,
            })
            .then((res): void => {
                console.log(`Email insert:`, res)
            })
    }
}
