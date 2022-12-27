import { getDb, User } from '../../db/db.ts'
import { INTENT_ONBOARDING_FINISHED } from './constants.ts'

const EMAIL_SUBJECT = 'Welcome to GOSH!'
const EMAIL_HTML_FILE = 'emails/onboarding_finished.html'
const EMAIL_TEXT = `\
Good news!

Your repository has been successfully uploaded to GOSH

Your DAO has been set up for you, and you're now all set to build consensus around your code

START BUILDING https://app.gosh.sh/a/signin
`

export async function emailOnboardingFinished(user: User) {
    if (!user.email) {
        const err_message = `Error: User ${user} has no email`
        console.log(err_message)
        throw new Error(err_message)
    }

    const mail_to = user.email.trim()
    const mail_html = new TextDecoder().decode(Deno.readFileSync(EMAIL_HTML_FILE))

    // TODO: should be done via DB constraint
    const { data: emails, error } = await getDb()
        .from('emails')
        .select()
        .eq('intent', INTENT_ONBOARDING_FINISHED)
        .eq('mail_to', mail_to)

    console.log(`Emails: ${emails}`)

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
                content: EMAIL_TEXT,
                html: mail_html,
                intent: INTENT_ONBOARDING_FINISHED,
            })
            .then((res): void => {
                console.log(`Email insert:`, res)
            })
    }
}
