import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { INTENT_ONBOARDING_FINISHED } from '../actions/emails/constants.ts'
import { emailWelcomeHighDemand } from '../actions/emails/welcome_high_demand.ts'
import { getDb } from '../db/db.ts'
import { getUserSendEmail } from '../db/users.ts'

const mutex = new Mutex()

getDb()
    .channel('new_users')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
            console.log('users', payload)
            notifyNewUsers()
        },
    )
    .subscribe()

notifyNewUsers()

async function notifyNewUsers() {
    const release = await mutex.acquire()
    const now = new Date()

    try {
        const {
            data: { users },
            error,
        } = await getDb().auth.admin.listUsers()

        if (error) {
            console.log('DB error', error)
        }

        for (const user of users) {
            console.log('Process potentially new user', user.id)

            const user_created_at = new Date(user.created_at)
            let mail_to
            try {
                mail_to = await getUserSendEmail(user)
            } catch {
                console.error(`Error: user ${user.id} has no email`)
                continue
            }

            // TODO: improve with DB views/triggers
            if (now.getTime() - user_created_at.getTime() < 48 * 60 * 60 * 1000) {
                console.log(`Ignore old user ${user.id}`)
                continue
            }

            const { data: users, error: usersError } = await getDb()
                .from('users')
                .select()
                .eq('auth_user', user.id)
            if (usersError || users.length === 0) {
                console.log(`User ${user.id} has no public.user`)
                continue
            }

            // don't welcome if onboarded
            const { data: emails, error } = await getDb()
                .from('emails')
                .select()
                .eq('mail_to', mail_to)
                .eq('intent', INTENT_ONBOARDING_FINISHED)

            if (error) {
                console.log(`DB error: ${error}`)
                continue
            }

            if (emails.length > 0) {
                console.log(
                    `User ${user.id} already has onboarding email (no need to welcome)`,
                )
                continue
            }

            try {
                await emailWelcomeHighDemand(user)
            } catch (err) {
                // ignore errors
                console.log('Error while emailWelcomeHighDemand()', err)
            }
        }
    } catch (err) {
        console.error('Fail process new users', err)
    }
    release()
}
