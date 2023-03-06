import { getDb } from '../db/db.ts'
import { Database } from '../db/types.ts'

export type Github = Database['public']['Tables']['github']['Row']
export type GithubUpdate = Database['public']['Tables']['github']['Update']

export async function getGithubsWithoutDao(): Promise<Github[]> {
    const { data, error } = await getDb().from('github').select().is('dao_bot', null)
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    return data
}

export async function getGithubsForClone(dao_bot_id: string): Promise<Github[]> {
    const { data, error } = await getDb()
        .from('github')
        .select()
        .eq('dao_bot', dao_bot_id)
        .is('updated_at', null)
        .eq('ignore', false)
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    return data
}

export async function updateGithub(id: string, update: GithubUpdate) {
    const { data, error } = await getDb().from('github').update(update).eq('id', id)
    if (!error) {
        return data
    }
    console.error(error)
    throw new Error(error.message)
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

export async function getGithubWithDaoBot(id: string): Promise<Github> {
    const { data, error } = await getDb()
        .from('github')
        .select('*, dao_bot(*)')
        .eq('id', id)
        .single()
    if (!error && data) {
        return data
    }
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    throw new Error(`Github ${id} not found`)
}

export async function updateGithubByDaoBot(
    bot_id: string,
    update: GithubUpdate,
): Promise<void> {
    const { error } = await getDb().from('github').update(update).eq('dao_bot', bot_id)
    if (error) {
        throw new Error(`Update 'github' by dao bot id error (${error.message})`)
    }
}
