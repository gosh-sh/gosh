import { getDb } from '../../db/db.ts'
import { INTENT_DAO_INVITE } from './constants.ts'

const EMAIL_SUBJECT = 'You were invited to DAO'
const EMAIL_HTML_FILE = 'emails/dao_invite.html'
const EMAIL_TEXT = `\
You were invited to DAO

User {% sender_username %} has invited you to join their DAO

Become a member of the {% dao_name %} DAO on GOSH

Vote, contribute, and earn tokens — with security and decentralization guaranteed

Join now to start building

START BUILDING https://app.gosh.sh/a/signup
`

export async function emailDaoInvite(params: {
    dao_name: string
    sender_username: string
    recipient_email: string
}) {
    const { dao_name, sender_username, recipient_email } = params
    const mail_to = recipient_email.trim()

    let mail_html = new TextDecoder().decode(Deno.readFileSync(EMAIL_HTML_FILE))
    // TODO: Set template vars in more smart way
    mail_html = mail_html.replace(/{%\s*sender_username\s*%}/, sender_username)
    mail_html = mail_html.replace(/{%\s*dao_name\s*%}/, dao_name)

    let mail_text = EMAIL_TEXT.replace(/{%\s*sender_username\s*%}/, sender_username)
    mail_text = mail_text.replace(/{%\s*dao_name\s*%}/, dao_name)

    // Create email send queue record
    console.log(`Try create ${INTENT_DAO_INVITE} email ${mail_to}`)
    const { data, error } = await getDb()
        .from('emails')
        .insert({
            mail_to: mail_to,
            subject: EMAIL_SUBJECT,
            content: mail_text,
            html: mail_html,
            intent: INTENT_DAO_INVITE,
        })
        .select()
    if (error) {
        console.log('Create DAO invite email error', error.message)
        throw new Error('Create DAO invite email error')
    }
    console.log(`Email insert:`, data)
}
