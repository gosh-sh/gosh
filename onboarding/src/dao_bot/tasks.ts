import { MAX_RETRIES } from '../config.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { CHECK_ACCOUNT_QUEUE, CREATE_DAO_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'
import { calculateProfileAddr, deployProfile } from './blockchain.ts'
import { DaoBot, updateDaoBot } from './dao_bot.ts'
import { getBotNameByDao } from './utils.ts'

const checkAccountQueue = new Queue(CHECK_ACCOUNT_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

const createDaoQueue = new Queue(CREATE_DAO_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

export async function deployDaoBotProfile(dao_bot: DaoBot) {
    const bot_name = getBotNameByDao(dao_bot.dao_name)
    const bot_profile_addr = await calculateProfileAddr(bot_name)

    const onSuccess = async () => {
        await updateDaoBot(dao_bot.id, {
            profile_gosh_address: bot_profile_addr,
        })
        createDaoQueue.createJob({ dao_name: dao_bot.dao_name }).save()
    }

    if (await isAccountActive(bot_profile_addr)) {
        await onSuccess()
    } else {
        await deployProfile(bot_name, dao_bot.pubkey)

        // wait until account is ready
        const job = await checkAccountQueue
            .createJob({
                addr: bot_profile_addr,
            })
            // deduplication
            .setId(bot_profile_addr)
            .retries(MAX_RETRIES)
            .backoff('fixed', 10000)
            .save()

        job.on('failed', (err) => {
            console.error(`Account is not created `, err.message)
        })

        job.on('succeeded', async (res) => {
            await onSuccess()
        })
    }
}
