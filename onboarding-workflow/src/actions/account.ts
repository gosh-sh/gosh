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
        job.on('retrying', (err) => {
            console.log(`Retry: ${job.id}`, err.message)
        })
        job.on('failed', (err) => {
            console.log(`Dao is not created`, err.message)
            reject(err)
        })
        job.on('succeeded', (res) => {
            resolve(res)
        })
        job.save()
    })
}

export function waitForWalletAccess(
    wallet_addr: string,
    wallet_pubkey: string,
): Promise<unknown> {
    // wait for access
    const job = checkWalletAccessProducer()
        .createJob({
            wallet_addr,
            wallet_pubkey,
        })
        // deduplication
        .setId(wallet_addr)
        .retries(MAX_RETRIES)
        .backoff('fixed', 10000)
    return new Promise((resolve, reject) => {
        job.on('retrying', (err) => {
            console.log(`Retry: ${job.id}`, err.message)
        })
        job.on('failed', (err) => {
            console.log(
                `Error: ${job.id} Wallet access hasn't being granted`,
                err.message,
            )
            reject(err)
        })
        job.on('succeeded', (res) => {
            resolve(res)
        })
        job.save()
    })
}
