import { DaoBot, updateDaoBot } from '../db/dao_bot.ts'
import { getGithubsForDaoBot } from '../db/github.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { deployDao, getAddrDao } from '../eversdk/dao.ts'
import { calculateProfileAddr, deployProfile } from '../eversdk/dao_bot.ts'
import { getAddrWallet } from '../eversdk/gosh_repo.ts'
import { createGoshRepoProducer } from '../queues/mod.ts'
import { getBotNameByDaoName } from '../utils/dao_bot.ts'
import { waitForAccountActive, waitForWalletAccess } from './account.ts'

export async function initDaoBot(dao_bot: DaoBot) {
    const bot_name = getBotNameByDaoName(dao_bot.dao_name)
    const bot_profile_addr = await calculateProfileAddr(bot_name)

    // deploy DAO bot profile
    if (!(await isAccountActive(bot_profile_addr))) {
        await deployProfile(bot_name, dao_bot.pubkey)
        await waitForAccountActive(bot_profile_addr)
    }

    dao_bot = await updateDaoBot(dao_bot.id, {
        profile_gosh_address: bot_profile_addr,
    })

    if (!dao_bot.profile_gosh_address) {
        throw new Error(`Dao bot has no profile`)
    }

    const dao_addr = await getAddrDao(dao_bot.dao_name)

    // deploy DAO
    if (!(await isAccountActive(dao_addr))) {
        await deployDao(dao_bot.dao_name, dao_addr, dao_bot.seed)
        await waitForAccountActive(dao_addr)
    }

    // ensure wallet has access
    const wallet_addr = await getAddrWallet(dao_bot.profile_gosh_address, dao_addr)
    await waitForWalletAccess(wallet_addr)

    // queue create all repos
    const githubs = await getGithubsForDaoBot(dao_bot.id)
    for (const github of githubs) {
        createGoshRepoProducer()
            .createJob({
                github_id: github.id,
            })
            .setId(github.id)
            .save()
    }
}
