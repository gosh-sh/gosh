import { DaoBot, updateDaoBot } from '../db/dao_bot.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { calculateProfileAddr, deployProfile } from '../eversdk/dao_bot.ts'
import { createDaoProducer } from '../queues/mod.ts'
import { getBotNameByDaoName } from '../utils/dao_bot.ts'
import { waitForAccountActive } from './account.ts'

export async function deployDaoBotProfile(dao_bot: DaoBot) {
    const bot_name = getBotNameByDaoName(dao_bot.dao_name)
    const bot_profile_addr = await calculateProfileAddr(bot_name)

    if (!(await isAccountActive(bot_profile_addr))) {
        await deployProfile(bot_name, dao_bot.pubkey)
        await waitForAccountActive(bot_profile_addr)
    }

    await updateDaoBot(dao_bot.id, {
        profile_gosh_address: bot_profile_addr,
    })

    createDaoProducer().createJob({ dao_name: dao_bot.dao_name }).save()
}
