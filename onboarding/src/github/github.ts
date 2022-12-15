import { getDb } from '../db/db.ts'

export async function getGithubsWithoutDao() {
    const { data, error } = await getDb().from('github').select().is('dao_bot', null)
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    return data
}
