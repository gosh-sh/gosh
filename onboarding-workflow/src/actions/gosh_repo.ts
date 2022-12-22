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
    console.log('initializeGoshRepo github', github)
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
    console.log('dao_addr', dao_addr)
    const repo_addr = await getAddrRepository(repo_name, dao_addr)
    console.log('repo_addr', repo_addr)
    const wallet_addr = await getAddrWallet(dao_bot.profile_gosh_address, dao_addr)
    console.log('wallet_addr', wallet_addr)

    if (!(await isAccountActive(repo_addr))) {
        // ignore errors
        try {
            await deployRepository(repo_name, wallet_addr, dao_bot.seed)
        } catch (err) {
            // ignore errors
        }
        await waitForAccountActive(repo_addr)
    }
    console.log(`Repo ${repo_addr} is ready`)
    await pushRepo(repo_name, github, dao_bot)

    // TODO: update database
}

async function pushRepo(repo_name: string, github: Github, dao_bot: DaoBot) {
    console.log(`About to push`, github)
    // TODO: bash-push
    const root_dir = `/tmp/${dao_bot.dao_name}/${repo_name}`
    await Deno.mkdir(root_dir, { recursive: true })
    // Deno.run({ cmd: [], cwd: root_dir })
}
