import { MAX_RETRIES } from '../config.ts'
import { getAddrDao } from '../dao/blockchain.ts'
import { DaoBot } from '../dao_bot/dao_bot.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { getGithubWithDaoBot, Github } from '../github/github.ts'
import { CHECK_ACCOUNT_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'
import { deployRepository, getAddrRepository, getAddrWallet } from './blockchain.ts'
import { getRepoNameFromUrl } from './utils.ts'

const checkAccountQueue = new Queue(CHECK_ACCOUNT_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

export async function initializeGoshRepo(github_id: string) {
    const github = await getGithubWithDaoBot(github_id)
    if (!github.dao_bot) {
        throw new Error('Repo has no dao_bot')
    }
    const dao_bot = github.dao_bot as unknown as DaoBot

    const repo_name = getRepoNameFromUrl(github.gosh_url)
    if (!repo_name) {
        throw new Error('Repo name is empty')
    }
    if (!dao_bot.profile_gosh_address) {
        throw new Error('Dao bot has no profile')
    }

    const dao_addr = await getAddrDao(dao_bot.dao_name)
    const repo_addr = await getAddrRepository(repo_name, dao_addr)
    const wallet_addr = await getAddrWallet(dao_bot.profile_gosh_address, dao_addr)

    const onSuccess = async () => {
        await runPushRepo(github, dao_bot)

        // if no errors update github updated_at field
    }

    if (!isAccountActive(repo_addr)) {
        await onSuccess()
    } else {
        // ignore errors
        await deployRepository(repo_name, wallet_addr, dao_bot.seed)

        // wait until repo active
        const job = await checkAccountQueue
            .createJob({
                addr: repo_addr,
            })
            // deduplication
            .setId(repo_addr)
            .retries(MAX_RETRIES)
            .backoff('fixed', 10000)
            .save()

        job.on('failed', (err) => {
            console.error(
                `Repo ${dao_bot.dao_name}/${repo_name} is not created`,
                err.message,
            )
        })

        job.on('succeeded', async (res) => {
            await onSuccess()
        })
    }
}

async function runPushRepo(github: Github, dao_bot: DaoBot) {
    // TODO: bash-push
}
