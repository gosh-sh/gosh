import { hasAccess } from '../eversdk/account.ts'
import { checkWalletAccessConsumer } from '../queues/mod.ts'

console.log('Ready')

checkWalletAccessConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { wallet_addr, wallet_pubkey } = job.data
    if (await hasAccess(wallet_addr, wallet_pubkey)) {
        return true
    }
    console.log(`Error: Wallet ${wallet_addr} has no access`)
    throw new Error(`Wallet ${wallet_addr} has no access`)
})
