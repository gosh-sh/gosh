import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { getDaoBotsWithoutProfile } from './dao_bot/dao_bot.ts'
import { getBotNameByDao } from './dao_bot/utils.ts'
import { getDb } from './db/db.ts'
import { NETWORK, SYSTEM_CONTRACT_ADDR } from './eversdk/client.ts'

dotenv.config({ export: true })

const mutex = new Mutex()

getDb()
    .channel('githubs:without_dao')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dao_bot' },
        async (payload) => {
            console.log('githubs updated', payload)
            await initNewDaoBot()
        },
    )
    .subscribe()

initNewDaoBot()

async function initNewDaoBot() {
    const release = await mutex.acquire()
    try {
        const dao_bots = await getDaoBotsWithoutProfile()

        for (const dao_bot of dao_bots) {
            console.log('Init dao bot:', dao_bot.dao_name)
            const p = Deno.run({
                cmd: ['bash', 'bin/create_dao_bot_profile.sh'],
                stdout: 'piped',
                env: {
                    NETWORK: NETWORK,
                    SYSTEM_CONTRACT_ABI: './abi/systemcontract.abi.json',
                    SYSTEM_CONTRACT_ADDR: SYSTEM_CONTRACT_ADDR,
                    USER_NAME: getBotNameByDao(dao_bot.dao_name),
                    USER_PUBKEY: dao_bot.pubkey,
                },
            })
            await p.status()
            const output = await p.output()
            const outputDecoded = new TextDecoder().decode(output)
            console.log(outputDecoded)
        }
    } catch (err) {
        console.error('Fail update dao bots', err)
    }
    release()
}
