import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import HackathonABI from './abi/hackathon.abi.json'

export class Hackathon extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, HackathonABI, address)
  }

  async getDetails() {
    const details = await this.runLocal('getDetails', {})
    const members_karma_rest = Object.entries(details.wallets).map(([profile, data]) => {
      const count = parseInt((data as any).count as string)
      return [`0:${profile.slice(2)}`, count]
    })
    const applications = details.details.map((app: string, index: number) => {
      const parsed = JSON.parse(app)

      const members_karma_voted = Object.entries(details.walletsvoted).map(
        ([profile, data]) => {
          const value_str = ((data as any[])[index] as string) || '0'
          return [`0:${profile.slice(2)}`, parseInt(value_str)]
        },
      )

      return {
        ...parsed,
        index,
        votes: parseInt(details.value0[index]),
        dao_address: details.value1[index],
        members_karma_voted: Object.fromEntries(members_karma_voted),
      }
    })

    return {
      prize_wallets: details.value1,
      prize_distribution: details.value2,
      name: details.value3,
      is_ready: details.value4,
      metadata: JSON.parse(details.value5),
      expert_tags: details.isTag,
      applications,
      members_karma_rest: Object.fromEntries(members_karma_rest),
    }
  }
}
