import { hasAccess } from '../eversdk/account.ts'
import { checkWalletAccessConsumer } from '../queues/mod.ts'

checkWalletAccessConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { wallet_addr } = job.data
    if (await hasAccess(wallet_addr)) {
        return true
    }
    console.error(`Wallet ${wallet_addr} has no access`)
    throw new Error(`Wallet ${wallet_addr} has no access`)
})
