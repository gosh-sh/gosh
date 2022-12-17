import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import { getDaoBotsForInit } from './dao_bot/dao_bot.ts'
import { getBotNameByDao } from './dao_bot/utils.ts'
import { getDb } from './db/db.ts'
import { NETWORK, SYSTEM_CONTRACT_ABI, SYSTEM_CONTRACT_ADDR } from './eversdk/client.ts'
import { MAX_RETRIES } from './settings.ts'
import { tonos_cli } from './shortcuts.ts'

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
        }
    } catch (err) {
        console.error('Fail update dao bots', err)
    }
    release()
}

async function getOrCreateProfile(name: string, pubkey: string): Promise<string> {
    if (!pubkey.startsWith('0x')) {
        pubkey = `0x${pubkey}`
    }
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const { value0: bot_profile_addr } = await tonos_cli(
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
                await tonos_cli(
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

async function getOrCreateDao(dao_name: string) {
    // DAO_ADDR=$($TONOS_CLI -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}"
    // --abi $SYSTEM_CONTRACT_ABI | jq -r .value0)
    // INITIAL_WALLET_ADDR=$($TONOS_CLI -j -u $NETWORK run $DAO_ADDR getWallets {} --abi $DAO_ABI | jq -r ".value0 | first")
    // $TONOS_CLI -j -u $NETWORK call $INITIAL_WALLET_ADDR \
    //     AloneSetConfigDao "{\"newtoken\": $WELCOME_TOKENS}" \
    //     --abi $CONTRACTS_PATH/goshwallet.abi.json --sign "$INITIAL_SEED" > /dev/null || exit 20
    try {
        const { value0 } = await tonos_cli(
            'run',
            '--abi',
            SYSTEM_CONTRACT_ABI,
            SYSTEM_CONTRACT_ADDR,
            'getAddrDao',
            JSON.stringify({ name: dao_name }),
        )
        return value0
    } catch (err) {
        console.log(err)
    }
}
