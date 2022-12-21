import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { initDaoBot } from './actions/dao_bot.ts'
import { getDaoBotsForInit } from './db/dao_bot.ts'
import { getDb } from './db/db.ts'

const mutex = new Mutex()

getDb()
    .channel('dao_bots_for_init')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dao_bot' },
        async (payload) => {
            console.log('dao bots updated', payload)
            await initNewDaoBots()
        },
    )
    .subscribe()

initNewDaoBots()

async function initNewDaoBots() {
    const release = await mutex.acquire()
    try {
        const dao_bots = await getDaoBotsForInit()

        for (const dao_bot of dao_bots) {
            console.log('Process dao bot for', dao_bot.dao_name)

            // create profile addr if not present
            await initDaoBot(dao_bot)
        }
    } catch (err) {
        console.error('Fail update dao bots', err)
    }
    release()
}
