import { resolveFetch } from 'https://esm.sh/v99/@supabase/gotrue-js@2.4.3/dist/module/lib/helpers'
import { MAX_RETRIES } from '../config.ts'
import { getDaoBotByDaoName } from '../dao_bot/dao_bot.ts'
import { getAccess, isAccountActive } from '../eversdk/account.ts'
import { getGithubsForDaoBot } from '../github/github.ts'
import { getAddrWallet } from '../gosh_repo/blockchain.ts'
import {
    CHECK_ACCOUNT_QUEUE,
    CHECK_WALLET_ACCESS_QUEUE,
    CREATE_GOSH_REPO_QUEUE,
} from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'
import { deployDao, getAddrDao } from './blockchain.ts'

const checkAccountQueue = new Queue(CHECK_ACCOUNT_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

const checkWalletAccessConsumer = new Queue(CHECK_WALLET_ACCESS_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

const createGoshRepoQueue = new Queue(CREATE_GOSH_REPO_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

export async function createDao(dao_name: string) {
    const dao_bot = await getDaoBotByDaoName(dao_name)
    if (!dao_bot) {
        throw new Error(`Dao bot not found for ${dao_name}`)
    }
    if (!dao_bot.profile_gosh_address) {
        throw new Error(`Dao bot has no profile`)
    }
    const dao_bot_profile_addr = dao_bot.profile_gosh_address

    const dao_addr = await getAddrDao(dao_name)

    const onSuccess = async () => {
        // get all non-uploaded repos for dao
        const wallet_addr = await getAddrWallet(dao_bot_profile_addr, dao_addr)

        await waitForWalletAccess(wallet_addr)

        // queue create all repos
        const githubs = await getGithubsForDaoBot(dao_bot.id)
        for (const github of githubs) {
            createGoshRepoQueue
                .createJob({
                    github_id: github.id,
                })
                .setId(github.id)
                .save()
        }
    }

    if (await isAccountActive(dao_addr)) {
        await onSuccess()
    } else {
        await deployDao(dao_name, dao_addr, dao_bot.seed)

        // wait until dao is ready
        const job = await checkAccountQueue
            .createJob({
                addr: dao_addr,
            })
            // deduplication
            .setId(dao_addr)
            .retries(MAX_RETRIES)
            .backoff('fixed', 10000)
            .save()

        job.on('failed', (err) => {
            console.error(`Dao is not created`, err.message)
        })

        job.on('succeeded', async (res) => {
            await onSuccess()
        })
    }
}

function waitForWalletAccess(wallet_addr: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        // wait for access
        checkWalletAccessConsumer
            .createJob({
                addr: wallet_addr,
            })
            // deduplication
            .setId(wallet_addr)
            .retries(MAX_RETRIES)
            .backoff('fixed', 10000)
            .save()
            .then((job) => {
                job.on('failed', (err) => {
                    console.error(`Wallet access hasn't being granted`, err.message)
                    reject(err)
                })

                job.on('succeeded', (res) => {
                    resolve(res)
                })
            })
    })
}
