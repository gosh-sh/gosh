import nunjucks from 'npm:nunjucks'
import { getDb } from '../../db/db.ts'
import { INTENT_DAO_INVITE } from './constants.ts'

const EMAIL_SUBJECT = 'You were invited to DAO'
const EMAIL_HTML_FILE = 'emails/dao_invite.html.template'
const EMAIL_TEXT_FILE = 'emails/dao_invite.text.template'

export async function emailDaoInvite(params: {
    dao_name: string
    sender_username: string
    recipient_email: string
    token: string
}) {
    const { dao_name, sender_username, recipient_email, token } = params
    const mail_to = recipient_email.trim()
    const mail_html = nunjucks.render(EMAIL_HTML_FILE, {
        dao_name,
        sender_username,
        token,
    })
    const mail_text = nunjucks.render(EMAIL_TEXT_FILE, {
        dao_name,
        sender_username,
        token,
    })

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
