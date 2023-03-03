import { getDb, User } from '../../db/db.ts'

export async function getUserByIdOrFail(auth_user_id: string): Promise<User> {
    const {
        data: { user },
        error,
    } = await getDb().auth.admin.getUserById(auth_user_id)
    if (error) {
        console.log('DB error', error)
        throw new Error(`DB error ${error.message}`)
    }
    if (!user) {
        throw new Error(`DB error user ${auth_user_id} not found`)
    }
    return user
}
