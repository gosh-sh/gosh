import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { MAX_RETRIES } from './config.ts'
import { getDaoBotsForInit } from './dao_bot/dao_bot.ts'
import { getBotNameByDao } from './dao_bot/utils.ts'
import { getDb } from './db/db.ts'
import { PROFILE_ABI, SYSTEM_CONTRACT_ABI } from './eversdk/abi.ts'
import { SYSTEM_CONTRACT_ADDR } from './eversdk/client.ts'
import { tonosCli } from './shortcuts.ts'

type Account = {
    acc_type: 'Active' | string
    address: string
    balance: string
    last_paid: string
    last_trans_lt: string
    'data(boc)': string
    code_hash: string
}

dotenv.config({ export: true })

const mutex = new Mutex()

getDb()
    .channel('dao_bots_for_init')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dao_bot' },
        async (payload) => {
            console.log('dao bots updated', payload)
            await initNewDaoBot()
        },
    )
    .subscribe()

initNewDaoBot()

async function initNewDaoBot() {
    const release = await mutex.acquire()
    try {
        const dao_bots = await getDaoBotsForInit()

        for (let dao_bot of dao_bots) {
            console.log('Process dao bot for', dao_bot.dao_name)
            // create profile addr if not present
            if (!dao_bot.profile_gosh_address) {
                console.log('Get or create dao bot for:', dao_bot.dao_name)
                const bot_user_name = getBotNameByDao(dao_bot.dao_name)
                const bot_profile_gosh_address = await getOrCreateProfile(
                    bot_user_name,
                    dao_bot.pubkey,
                )

                const { data, error } = await getDb()
                    .from('dao_bot')
                    .update({
                        profile_gosh_address: bot_profile_gosh_address,
                    })
                    .eq('id', dao_bot.id)
                    .select()
                    .single()
                if (!error) {
                    dao_bot = data
                }
            }

            // create dao
            if (!dao_bot.profile_gosh_address) {
                console.error('This should be unreachable')
                continue
            }

            console.log('Attempt to create dao', dao_bot.dao_name)
            const dao_addr = await getAddrDao(dao_bot.dao_name)
            try {
                const dao = await getOrCreateDao(
                    dao_addr,
                    dao_bot.dao_name,
                    dao_bot.profile_gosh_address,
                    dao_bot.seed,
                )
            } catch (err) {
                // ignore for now
                console.log(err)
                continue
            }

            // schedule repo upload

            console.log('Finish')
        }
    } catch (err) {
        console.error('Fail update dao bots', err)
    }
    release()
}

async function getOrCreateDao(
    dao_addr: string,
    dao_name: string,
    user_profile_addr: string,
    user_seed: string,
): Promise<Account> {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const data = await getAccount(dao_addr)
            console.log('Got account data', data)
            if (data) {
                const { [dao_addr]: dao } = data
                if (dao?.acc_type === 'Active') {
                    return dao
                }
            }
            const res = await deployDao(dao_name, user_profile_addr, user_seed)
            console.log('Deploy dao res', res)
            console.log('Sleep...')
            await sleep(5)
        } catch (err) {
            console.error(`Attempt ${i}:`, err)
        }
    }
    throw new Error(`Can't get or create dao ${dao_name}`)
}

async function getOrCreateProfile(name: string, pubkey: string): Promise<string> {
    if (!pubkey.startsWith('0x')) {
        pubkey = `0x${pubkey}`
    }
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const { value0: bot_profile_addr } = await tonosCli(
                'run',
                '--abi',
                SYSTEM_CONTRACT_ABI,
                SYSTEM_CONTRACT_ADDR,
                'getProfileAddr',
                JSON.stringify({ name }),
            )
            console.log('getProfileAddr =', bot_profile_addr)
            return bot_profile_addr
        } catch (err) {
            // assume not found and try create
            console.log('Get profile error', err)

            try {
                await tonosCli(
                    'call',
                    '--abi',
                    SYSTEM_CONTRACT_ABI,
                    SYSTEM_CONTRACT_ADDR,
                    'deployProfile',
                    JSON.stringify({ pubkey, name }),
                )
            } catch (err) {
                //ignore
                console.log('Deploy profile error', err)
            }
        }
    }
    throw new Error(`Can't get or create profile for ${name}`)
}

async function getAddrDao(dao_name: string): Promise<string> {
    const { value0 } = await tonosCli(
        'run',
        '--abi',
        SYSTEM_CONTRACT_ABI,
        SYSTEM_CONTRACT_ADDR,
        'getAddrDao',
        JSON.stringify({ name: dao_name }),
    )
    return value0
}

async function getAccount(addr: string): Promise<{ [key: string]: Account } | null> {
    return await tonosCli('account', addr)
}

async function deployDao(dao_name: string, profile_addr: string, seed: string) {
    return await tonosCli(
        'call',
        '--abi',
        PROFILE_ABI,
        profile_addr,
        '--sign',
        seed,
        'deployDao',
        JSON.stringify({
            systemcontract: SYSTEM_CONTRACT_ADDR,
            name: dao_name,
            pubmem: [profile_addr],
        }),
    )
}
