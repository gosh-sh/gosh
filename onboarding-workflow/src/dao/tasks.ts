import { MAX_RETRIES } from '../config.ts'
import { getDaoBotByDaoName } from '../dao_bot/dao_bot.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { getGithubsForDaoBot } from '../github/github.ts'
import { CHECK_ACCOUNT_QUEUE, CREATE_GOSH_REPO_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'
import { deployDao, getAddrDao } from './blockchain.ts'

const checkAccountQueue = new Queue(CHECK_ACCOUNT_QUEUE, {
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

    const dao_addr = await getAddrDao(dao_name)

    const onSuccess = async () => {
        // get all non-uploaded repos for dao
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
