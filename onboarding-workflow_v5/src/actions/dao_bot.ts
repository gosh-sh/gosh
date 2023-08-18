import { DaoBot, updateDaoBot } from '../db/dao_bot.ts'
import { getGithubsForClone, Github, updateGithubByDaoBot } from '../db/github.ts'
import { hasAccess, isAccountActive } from '../eversdk/account.ts'
import {
    deployDao,
    getAddrDao,
    isDaoMember,
    countDaoMembers,
    getDaoMemberNames,
    setRepoUpdated,
    turnOnDao,
} from '../eversdk/dao.ts'
import { calculateProfileAddr, deployProfile } from '../eversdk/dao_bot.ts'
import { getAddrWallet } from '../eversdk/gosh_repo.ts'
import { countGitObjectsProducer } from '../queues/mod.ts'
import { getBotNameByDaoName } from '../utils/dao_bot.ts'
import { waitForAccountActive, waitForWalletAccess } from './account.ts'
import { getDb } from '../db/db.ts'
import { emailOnboardingRename } from './emails/onboarding_rename.ts'
import { getUserByIdOrFail } from '../db/auth/users.ts'
import { isValidName } from '../utils/validate_name.ts'

export const GOSH_VERSION = Deno.env.get('GOSH_VERSION') ?? ''

export async function initDaoBot(dao_bot: DaoBot) {
    const bot_name = getBotNameByDaoName(dao_bot.dao_name)

    const bot_profile_addr = await calculateProfileAddr(bot_name)
    console.log(`DAO bot profile_addr = ${bot_profile_addr}`)

    // deploy DAO bot profile
    if (!(await isAccountActive(bot_profile_addr))) {
        try {
            await deployProfile(bot_name, dao_bot.pubkey)
        } catch (_err) {
            // ignore all errors
        }
        await waitForAccountActive(bot_profile_addr)
    }
    console.log(`DAO bot ${bot_name} is active`)

    dao_bot = await updateDaoBot(dao_bot.id, {
        profile_gosh_address: bot_profile_addr,
    })

    if (!dao_bot.profile_gosh_address) {
        throw new Error(`Dao bot has no profile`)
    }

    // Validate DAO name
    if (!isValidName(dao_bot.dao_name)) {
        // Mark `github` row as `ignore` until error is resolved
        await updateGithubByDaoBot(dao_bot.id, { ignore: true })

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
            'DAO name has validation errors',
            dao_bot.dao_name,
            'bot_profile_addr',
            bot_profile_addr,
        )
        throw new Error('DAO name has validation errors')
    }

    const dao_addr = await getAddrDao(dao_bot.dao_name)

    // deploy DAO
    if (!(await isAccountActive(dao_addr))) {
        try {
            // TODO: make this part more smart:
            // 1. DAO already created by user itself (or before)
            // 2. we can't have an access to it and SHOULDN'T
            await deployDao(dao_bot.dao_name, dao_bot.profile_gosh_address, dao_bot.seed)
        } catch (_err) {
            // ignore error for now
        }
        await waitForAccountActive(dao_addr)
        // assert if not a member of DAO
    }

    if (!(await isDaoMember(dao_addr, bot_profile_addr))) {
        // Mark `github` row as `ignore` until error is resolved
        await updateGithubByDaoBot(dao_bot.id, { ignore: true })

        // TODO: Send notification email
        console.log(
            'DAO exists but account is not a member of DAO',
            dao_addr,
            'bot_profile_addr',
            bot_profile_addr,
        )
        throw new Error(`DAO exists but account is not a member of DAO`)
    }

    const number_of_members = await countDaoMembers(dao_addr)
    if (number_of_members > 1) {
        const member_names = (await getDaoMemberNames(dao_addr)).filter(n => n != bot_name)
        const { data: githubs, error } = await getDb()
            .from('github')
            .select('users(auth_user, gosh_username)')
            .eq('dao_bot', dao_bot.id)

        if (error) {
            console.log('DB error', error)
            throw new Error(`DB error ${error.message}`)
        }

        const gosh_users = githubs
            .filter((github) => !!github.users && !Array.isArray(github.users))
            .map((github) => ({
                id: (github.users! as { auth_user: string }).auth_user,
                name: (github.users! as { gosh_username: string }).gosh_username,
            }))
            .reduce((acc, user) => // remove duplicates
                acc.findIndex(el => el.id == user.id && el.name == user.name) > -1 ? acc : [...acc, user],
                []
            )

        for (const user of gosh_users) {
            if (!member_names.includes(user.name)) {
                const auth_user = await getUserByIdOrFail(user.id)
                await emailOnboardingRename(auth_user)
                console.log(
                    `User tries to onboard to the existing DAO ${dao_bot.dao_name} <${dao_addr}>.`,
                    `User: ${user.name}`,
                )
            }
        }

        throw new Error(`There are already members in the DAO`)
    }

    // ensure wallet has access
    const wallet_addr = await getAddrWallet(dao_bot.profile_gosh_address, dao_addr)
    if (!(await hasAccess(wallet_addr, dao_bot.pubkey))) {
        try {
            await turnOnDao(
                wallet_addr,
                dao_bot.profile_gosh_address,
                dao_bot.pubkey,
                dao_bot.seed,
            )
        } catch (_err) {
            // ignore error for now
        }
        console.log(`About to wait for access ${wallet_addr}`)
        await waitForWalletAccess(wallet_addr, dao_bot.pubkey)
    }

    // TODO: check if we need to do it for v2
    if (GOSH_VERSION !== '1.0.0') {
        await setRepoUpdated(wallet_addr, dao_bot.seed)
    }

    console.log(`Wallet access granted for ${wallet_addr}`)

    // queue create all repos
    const githubs: Github[] = await getGithubsForClone(dao_bot.id)
    for (const github of githubs) {
        console.log(`Schedule task for repo ${github.id} ${github.github_url}`)
        countGitObjectsProducer()
            .createJob({
                github_id: github.id,
            })
            .retries(5)
            .setId(github.id)
            .save()
    }
}
