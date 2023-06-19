import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { emailDaoInvite } from '../actions/emails/dao_invite.ts'
import { getDb } from '../db/db.ts'

while (true) {
    // Get unprocessed DAO invitations
    const { data, error } = await getDb()
        .from('dao_invite')
        .select('id, recipient_email, dao_name, sender_username, token')
        .eq('is_recipient_sent', false)
    if (error) {
        throw new Error(error.message)
    }
    if (!data || !data.length) {
        await sleep(30)
        continue
    }

    // Create send email tasks, update db record flag
    for (const item of data) {
        const { id } = item

        const params = {
            dao_name: item.dao_name!,
            sender_username: item.sender_username!,
            recipient_email: item.recipient_email!,
            token: item.token!,
        }
        if (Object.values(params).findIndex((v) => !!v === false) >= 0) {
            console.log('Required attribute is empty', params)
            continue
        }

        await emailDaoInvite(params)
        const { error } = await getDb()
            .from('dao_invite')
            .update({ is_recipient_sent: true })
            .eq('id', id)
        if (error) {
            console.log('Error updating dao invite status', error.message)
        }
    }

    await sleep(30)
}
