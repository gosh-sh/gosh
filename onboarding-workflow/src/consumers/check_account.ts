import { isAccountActive } from '../eversdk/account.ts'
import { CHECK_ACCOUNT_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'

const checkAccountConsumer = new Queue(CHECK_ACCOUNT_QUEUE, {
    redis: getRedisClient(),
    isWorker: true,
    getEvents: true,
})

checkAccountConsumer.process(async (job) => {
    console.log('Got', job.data)
    const { addr } = job.data
    if (await isAccountActive(addr)) {
        return true
    }
    console.error(`Account ${addr} is not active`)
    throw new Error(`Account ${addr} is not active`)
})
