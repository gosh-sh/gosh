import { isAccountActive } from '../eversdk/account.ts'
import { checkAccountConsumer } from '../queues/mod.ts'

console.log('Ready')

checkAccountConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { addr } = job.data
    if (await isAccountActive(addr)) {
        return true
    }
    console.error(`Account ${addr} is not active`)
    throw new Error(`Account ${addr} is not active`)
})
