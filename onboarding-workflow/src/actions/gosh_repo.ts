import { DaoBot } from '../db/dao_bot.ts'
import { Github, getGithubWithDaoBot } from '../db/github.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { getAddrDao } from '../eversdk/dao.ts'
import {
    deployRepository,
    getAddrRepository,
    getAddrWallet,
} from '../eversdk/gosh_repo.ts'
import { getRepoNameFromUrl } from '../utils/gosh_repo.ts'
import { waitForAccountActive } from './account.ts'

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

    if (!(await isAccountActive(repo_addr))) {
        // ignore errors
        await deployRepository(repo_name, wallet_addr, dao_bot.seed)
        await waitForAccountActive(repo_addr)
        console.log(`Repo ${repo_addr} is ready`)
    }
    await runPushRepo(github, dao_bot)
}

async function runPushRepo(github: Github, dao_bot: DaoBot) {
    // TODO: bash-push
}
