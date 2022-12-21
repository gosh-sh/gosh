import { MAX_RETRIES } from '../config.ts'
import { checkAccountProducer, checkWalletAccessProducer } from '../queues/mod.ts'

export function waitForAccountActive(addr: string) {
    const job = checkAccountProducer()
        .createJob({
            addr,
        })
        // deduplication
        .setId(addr)
        .retries(MAX_RETRIES)
        .backoff('fixed', 10000)

    return new Promise((resolve, reject) => {
        job.on('failed', (err) => {
            console.error(`Dao is not created`, err.message)
            reject(err)
        })

        job.on('succeeded', (res) => {
            resolve(res)
        })
        job.save()
    })
}

export function waitForWalletAccess(wallet_addr: string): Promise<unknown> {
    // wait for access
    const job = checkWalletAccessProducer()
        .createJob({
            wallet_addr,
        })
        // deduplication
        .setId(wallet_addr)
        .retries(MAX_RETRIES)
        .backoff('fixed', 10000)
    return new Promise((resolve, reject) => {
        job.on('failed', (err) => {
            console.error(`Wallet access hasn't being granted`, err.message)
            reject(err)
        })
        job.on('succeeded', (res) => {
            resolve(res)
        })
        job.save()
    })
}
