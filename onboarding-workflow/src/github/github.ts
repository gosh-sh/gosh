import { getDb } from '../db/db.ts'
import { Database } from '../db/types.ts'

export type Github = Database['public']['Tables']['github']['Row']

export async function getGithubsWithoutDao(): Promise<Github[]> {
    const { data, error } = await getDb().from('github').select().is('dao_bot', null)
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    return data
}

export async function getGithubsForDaoBot(dao_bot_id: string): Promise<Github[]> {
    const { data, error } = await getDb()
        .from('github')
        .select()
        .eq('dao_bot', dao_bot_id)
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    return data
}

export async function getGithub(id: string): Promise<Github> {
    const { data, error } = await getDb().from('github').select().eq('id', id).single()
    if (!error && data) {
        return data
    }
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    throw new Error(`Github ${id} not found`)
}
