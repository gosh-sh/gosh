import { getDb } from './db.ts'
import { Database } from './types.ts'
import { generateEverWallet } from '../eversdk/tasks.ts'

export type DaoBot = Database['public']['Tables']['dao_bot']['Row']
export const GOSH_VERSION = Deno.env.get('GOSH_VERSION') ?? ''

export async function createDaoBot(dao_name: string): Promise<DaoBot> {
    const version = GOSH_VERSION
    const { data, error } = await getDb()
        .from('dao_bot')
        .insert({
            dao_name,
            version,
            ...(await generateEverWallet()),
        })
        .select()
        .single()
    if (error) {
        console.error('Db error:', error)
        throw new Error(error.message)
    }
    if (!data) {
        console.error('No data after insert', dao_name)
    }
    return data
}

export async function getDaoBotByDaoName(dao_name: string): Promise<DaoBot | null> {
    const { data, error } = await getDb()
        .from('dao_bot')
        .select()
        .eq('dao_name', dao_name)
        .single()
    if (error) {
        console.error('Db error:', error)
        return null
    }
    return data
}

export async function getDaoBot(id: string): Promise<DaoBot | null> {
    const { data, error } = await getDb().from('dao_bot').select().eq('id', id).single()
    if (error) {
        console.error('Db error:', error)
        return null
    }
    return data
}

export async function getOrCreateDaoBot(dao_name: string): Promise<DaoBot> {
    return (await getDaoBotByDaoName(dao_name)) ?? (await createDaoBot(dao_name))
}

export async function getDaoBotsForInit() {
    const version = GOSH_VERSION
    if (version === '1.0.0') {
        const { data, error } = await getDb()
          .from('dao_bot')
          .select()
          .is('initialized_at', null)
          .or('version.eq."1.0.0",version.is.null')
          .order('created_at', { ascending: false })
        if (error) {
            console.log(error)
            throw new Error(error.message)
        }
        return data
    } else {
        const { data, error } = await getDb()
          .from('dao_bot')
          .select()
          .is('initialized_at', null)
          .eq('version', version)
          .order('created_at', { ascending: false })
        if (error) {
            console.log(error)
            throw new Error(error.message)
        }
        return data
    }
}

export async function updateDaoBot(
    dao_bot_id: string,
    update_data: any,
): Promise<DaoBot> {
    const { data, error } = await getDb()
        .from('dao_bot')
        .update(update_data)
        .eq('id', dao_bot_id)
        .select()
        .single()
    if (!error && data) {
        return data
    }
    throw new Error(`Error while update dao bot ${error.message}`)
}
