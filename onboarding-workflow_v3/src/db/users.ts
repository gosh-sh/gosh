import { User, getDb } from './db.ts'

export async function getUsers() {}

export async function getUserSendEmail(user: User) {
    const { data, error } = await getDb()
        .from('users')
        .select('email_other')
        .eq('auth_user', user.id)
        .single()
    if (error) {
        throw new Error(error.message)
    }
    return data.email_other || user.email
}
