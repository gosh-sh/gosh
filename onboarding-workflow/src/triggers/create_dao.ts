import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { initDaoBot } from '../actions/dao_bot.ts'
import { getDaoBotsForInit } from '../db/dao_bot.ts'
// import { getDb } from '../db/db.ts'

const mutex = new Mutex()

// getDb()
//     .channel('dao_bots_for_init')
//     .on(
//         'postgres_changes',
//         { event: '*', schema: 'public', table: 'dao_bot' },
//         (payload) => {
//             console.log('dao bots updated', payload)
//             initNewDaoBots()
//         },
//     )
//     .subscribe()

while (true) {
    await initNewDaoBots()
    console.log('Sleep...')
    await sleep(30)
}

async function initNewDaoBots() {
    const release = await mutex.acquire()
    try {
        const dao_bots = await getDaoBotsForInit()

        for (const dao_bot of dao_bots) {
            console.log('Process dao bot for', dao_bot.dao_name)

            // create profile addr if not present
            initDaoBot(dao_bot).catch((err) => {
                console.log('Fail to init DAO bot', err.message)
            })
        }
    } catch (err) {
        console.error('Fail update dao bots', err)
    }
    release()
}
