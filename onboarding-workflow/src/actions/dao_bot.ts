import { DaoBot, updateDaoBot } from '../db/dao_bot.ts'
import { getGithubsForDaoBot, Github } from '../db/github.ts'
import { hasAccess, isAccountActive } from '../eversdk/account.ts'
import { deployDao, getAddrDao, turnOnDao } from '../eversdk/dao.ts'
import { calculateProfileAddr, deployProfile } from '../eversdk/dao_bot.ts'
import { getAddrWallet } from '../eversdk/gosh_repo.ts'
import { createGoshRepoProducer } from '../queues/mod.ts'
import { getBotNameByDaoName } from '../utils/dao_bot.ts'
import { waitForAccountActive, waitForWalletAccess } from './account.ts'

export async function initDaoBot(dao_bot: DaoBot) {
    const bot_name = getBotNameByDaoName(dao_bot.dao_name)
    const bot_profile_addr = await calculateProfileAddr(bot_name)
    console.log(`DAO bot profile_addr = ${bot_profile_addr}`)

    // deploy DAO bot profile
    if (!(await isAccountActive(bot_profile_addr))) {
        try {
            await deployProfile(bot_name, dao_bot.pubkey)
        } catch (err) {
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

    const dao_addr = await getAddrDao(dao_bot.dao_name)

    // deploy DAO
    if (!(await isAccountActive(dao_addr))) {
        try {
            // TODO: make this part more smart:
            // 1. DAO already created by user itself (or before)
            // 2. we can't have an access to it and SHOULDN'T
            await deployDao(dao_bot.dao_name, dao_bot.profile_gosh_address, dao_bot.seed)
        } catch (err) {
            // ignore error for now
        }
        await waitForAccountActive(dao_addr)
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
        } catch (err) {
            // ignore error for now
        }
        console.log(`About to wait for access ${wallet_addr}`)
        await waitForWalletAccess(wallet_addr, dao_bot.pubkey)
    }

    console.log(`Wallet access granted for ${wallet_addr}`)

    // queue create all repos
    const githubs: Github[] = await getGithubsForDaoBot(dao_bot.id)
    for (const github of githubs) {
        createGoshRepoProducer()
            .createJob({
                github_id: github.id,
            })
            .setId(github.id)
            .save()
    }
}
