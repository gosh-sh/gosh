import { getDb } from '../db/db.ts'
import { generateEverWallet } from '../eversdk/tasks.ts'

export async function createDaoBot(dao_name: string) {
    const { data, error } = await getDb()
        .from('dao_bot')
        .insert({
            dao_name,
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

export async function getDaoBot(dao_name: string) {
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

export async function getOrCreateDaoBot(dao_name: string) {
    return (await getDaoBot(dao_name)) ?? (await createDaoBot(dao_name))
}
