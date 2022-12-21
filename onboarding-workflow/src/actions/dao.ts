import { getDaoBotByDaoName } from '../db/dao_bot.ts'
import { getGithubsForDaoBot } from '../db/github.ts'
import { isAccountActive } from '../eversdk/account.ts'
import { getAddrDao, deployDao } from '../eversdk/dao.ts'
import { getAddrWallet } from '../eversdk/gosh_repo.ts'
import { createGoshRepoProducer } from '../queues/mod.ts'
import { waitForAccountActive, waitForWalletAccess } from './account.ts'

export async function createDao(dao_name: string) {
    const dao_bot = await getDaoBotByDaoName(dao_name)
    if (!dao_bot) {
        throw new Error(`Dao bot not found for ${dao_name}`)
    }
    if (!dao_bot.profile_gosh_address) {
        throw new Error(`Dao bot has no profile`)
    }

    const dao_addr = await getAddrDao(dao_name)

    if (!(await isAccountActive(dao_addr))) {
        await deployDao(dao_name, dao_addr, dao_bot.seed)
        await waitForAccountActive(dao_addr)
    }

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
