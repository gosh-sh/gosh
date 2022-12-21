import { hasAccess } from '../eversdk/account.ts'
import { CHECK_WALLET_ACCESS_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'

const checkWalletAccessConsumer = new Queue(CHECK_WALLET_ACCESS_QUEUE, {
    redis: getRedisClient(),
    isWorker: true,
    getEvents: true,
})

checkWalletAccessConsumer.process(async (job) => {
    console.log('Got', job.data)
    const { wallet_addr } = job.data
    if (await hasAccess(wallet_addr)) {
        return true
    }
    console.error(`Wallet ${wallet_addr} has no access`)
    throw new Error(`Wallet ${wallet_addr} has no access`)
})
