import { User, getDb } from './db.ts'

export async function getUsers() {}

export async function getUserSendEmail(user: User) {
    const { data, error } = await getDb()
        .from('users')
        .select('email_other')
        .eq('auth_user', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
    if (error) {
        console.error(error.message)
        throw new Error(error.message)
    }

    const email_other = data.length ? data[0].email_other : null
    const email = email_other || user.email
    if (!email) {
        const err_message = `Error: User ${user} has no email`
        console.error(err_message)
        throw new Error(err_message)
    }
    return email.trim()
}
