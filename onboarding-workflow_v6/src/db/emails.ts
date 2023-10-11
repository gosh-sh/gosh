import { getDb } from './db.ts'

export async function getEmailsNotSent() {
    const { data, error } = await getDb().from('emails').select().is('sent_at', null)

    if (error) {
        console.log('Db error:', error)
        throw new Error(error.message)
    }

    return data
}
