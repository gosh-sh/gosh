import nunjucks from 'npm:nunjucks'
import { getDb, User } from '../../db/db.ts'
import { INTENT_ONBOARDING_FINISHED } from './constants.ts'
import { getUserSendEmail } from '../../db/users.ts'

const EMAIL_SUBJECT = 'Welcome to GOSH!'
const EMAIL_HTML_FILE = 'emails/onboarding_finished.html.template'
const EMAIL_TEXT_FILE = 'emails/onboarding_finished.text.template'

export async function emailOnboardingFinished(user: User) {
    const mail_to = await getUserSendEmail(user)
    const mail_html = nunjucks.render(EMAIL_HTML_FILE)
    const mail_text = nunjucks.render(EMAIL_TEXT_FILE)

    // TODO: should be done via DB constraint
    const { data: emails, error } = await getDb()
        .from('emails')
        .select()
        .eq('intent', INTENT_ONBOARDING_FINISHED)
        .eq('mail_to', mail_to)

    console.log('Emails', emails)

    if (error) {
        console.log(`DB error`, error)
        throw new Error(error.message)
    }

    if (emails.length === 0) {
        console.log(`Try create ${INTENT_ONBOARDING_FINISHED} email ${mail_to}`)
        await getDb()
            .from('emails')
            .insert({
                mail_to: mail_to,
                subject: EMAIL_SUBJECT,
                content: mail_text,
                html: mail_html,
                intent: INTENT_ONBOARDING_FINISHED,
            })
            .then((res): void => {
                console.log(`Email insert:`, res)
            })
    }
}
