import { DaoBot } from '../db/dao_bot.ts'
import { Github, getGithubWithDaoBot, updateGithub } from '../db/github.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { GOSH_ENDPOINTS, SYSTEM_CONTRACT_ADDR } from '../eversdk/client.ts'
import { getAddrDao } from '../eversdk/dao.ts'
import {
    RepoStatus,
    deployRepository,
    getAddrRepository,
    getAddrWallet,
} from '../eversdk/gosh_repo.ts'
import { getBotNameByDaoName } from '../utils/dao_bot.ts'
import { getRepoNameFromUrl } from '../utils/gosh_repo.ts'
import { runWithTimeout } from '../utils/timeout.ts'
import { waitForAccountActive } from './account.ts'
import { getDb } from '../db/db.ts'
import { getUserByIdOrFail } from '../db/auth/users.ts'
import { emailOnboardingRename } from './emails/onboarding_rename.ts'
import { isValidName } from '../utils/validate_name.ts'

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

    // Validate repository name
    if (!isValidName(repo_name)) {
        // Mark `github` row as `ignore` until error is resolved
        await updateGithub(github_id, { ignore: true })

        const { data: githubs, error } = await getDb()
            .from('github')
            .select('*, users(auth_user)')
            .eq('dao_bot', dao_bot.id)

        if (error) {
            console.log('DB error', error)
            throw new Error(`DB error ${error.message}`)
        }

        const auth_user_ids = githubs
            .filter((github) => !!github.users && !Array.isArray(github.users))
            .map((github) => (github.users! as { auth_user: string }).auth_user)

        for (const auth_user_id of auth_user_ids) {
            const auth_user = await getUserByIdOrFail(auth_user_id)
            await emailOnboardingRename(auth_user)
        }

        console.log(
            'Repository name has validation errors',
            repo_name,
            'DAO name',
            dao_bot.dao_name,
        )
        throw new Error('Repository name has validation errors')
    }

    const dao_addr = await getAddrDao(dao_bot.dao_name)
    console.log('dao_addr', dao_addr)
    const repo_addr = await getAddrRepository(repo_name, dao_addr)
    console.log('repo_addr', repo_addr)
    const wallet_addr = await getAddrWallet(dao_bot.profile_gosh_address, dao_addr)
    console.log('wallet_addr', wallet_addr)

    let status
    if (!(await isAccountActive(repo_addr))) {
        try {
            status = await runWithTimeout(
                3 * 60 * 1000, // 3 minutes
                deployRepository(dao_addr, repo_name, wallet_addr, dao_bot.seed),
            )
            console.log("Deploy repo status:", status)
        } catch (err) {
            console.log('Error while deployRepository github_id', github_id)
            throw err
        }

        if (status === RepoStatus.WaitingVoting) {
            return
        } else if (status === RepoStatus.RejectedByVoting) {
            await updateGithub(github.id, {
                ignore: true,
                resolution: "Rejected as a result of voting"
            })
            return
        } else if (status === RepoStatus.Deploying) {
            await waitForAccountActive(repo_addr)
        }
    }

    console.log(`Repo ${repo_addr} is ready to be pushed`)

    const result = await pushRepo(repo_name, dao_addr, github, dao_bot)
    console.log('Repo push result', result)
    if (!result.success) {
        console.log(`git push exited with ${result.code}`)
        throw new Error(`git push exited with ${result.code}`)
    }

    await updateGithub(github.id, {
        updated_at: new Date().toISOString(),
    })
    console.log(`Repo ${github.id} has been clonned`)
}

async function pushRepo(
    repo_name: string,
    dao_addr: string,
    github: Github,
    dao_bot: DaoBot,
): Promise<Deno.CommandOutput> {
    console.log(`About to push`, github)
    const bot_name = getBotNameByDaoName(dao_bot.dao_name)
    const work_dir = `/tmp/${SYSTEM_CONTRACT_ADDR}/${dao_bot.dao_name}/${repo_name}`
    await Deno.mkdir(work_dir, { recursive: true })

    const config = JSON.stringify({
        'primary-network': 'mainnet',
        networks: {
            mainnet: {
                'user-wallet': {
                    profile: bot_name,
                    pubkey: dao_bot.pubkey,
                    secret: dao_bot.secret,
                },
                endpoints: GOSH_ENDPOINTS,
            },
        },
    })

    const gosh_config_path = `${work_dir}/gosh-config.json`
    await Deno.writeTextFile(gosh_config_path, config)

    const command = new Deno.Command('bash', {
        args: ['/app/bin/upload_repo.sh'],
        cwd: '/app/bin',
        env: {
            WORKDIR: work_dir,
            GIT_REPO_URL: `https://github.com${github.github_url}`,
            GOSH_SYSTEM_CONTRACT_ADDR: SYSTEM_CONTRACT_ADDR,
            GOSH_DAO_NAME: dao_bot.dao_name,
            GOSH_DAO_ADDRESS: dao_addr,
            GOSH_REPO_NAME: repo_name,
            GOSH_BOT_NAME: getBotNameByDaoName(dao_bot.dao_name),
            GOSH_CONFIG_PATH: gosh_config_path,
        },
    })
    return await command.output()
}
