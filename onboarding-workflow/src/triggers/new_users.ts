import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { emailWelcomeHighDemand } from '../actions/emails/welcome_high_demand.ts'
import { getDb } from '../db/db.ts'

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
    try {
        const {
            data: { users },
            error,
        } = await getDb().auth.admin.listUsers()

        if (error) {
            console.log('DB error', error)
        }

        for (const user of users) {
            console.log('Process potentially new user', user)

            // ignore errors
            emailWelcomeHighDemand(user)
        }
    } catch (err) {
        console.error('Fail process new users', err)
    }
    release()
}
