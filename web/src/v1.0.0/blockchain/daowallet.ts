import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import WalletABI from './abi/daowallet.abi.json'
import { SmvLocker } from './smvlocker'
import { SmvClient } from './smvclient'

export class DaoWallet extends BaseContract {
  constructor(client: TonClient, address: string, keys?: KeyPair) {
    super(client, WalletABI, address, { keys })
  }

  async isTurnedOn() {
    const { value0 } = await this.runLocal('getAccess', {})
    return !!value0
  }

  async getSmvLocker() {
    const { tip3VotingLocker } = await this.runLocal('tip3VotingLocker', {}, undefined, {
      useCachedBoc: true,
    })
    return new SmvLocker(this.client, tip3VotingLocker)
  }

  async getBalance() {
    const { m_pseudoDAOBalance } = await this.runLocal('m_pseudoDAOBalance', {})
    const balance = await this.smvLockerBalance()
    return {
      regular: parseInt(m_pseudoDAOBalance),
      ...balance,
    }
  }

  async smvLockerBusy() {
    const locker = await this.getSmvLocker()
    const { lockerBusy } = await locker.runLocal('lockerBusy', {})
    return lockerBusy
  }

  async smvLockerBalance() {
    const locker = await this.getSmvLocker()
    const { m_tokenBalance } = await locker.runLocal('m_tokenBalance', {})
    const { votes_locked } = await locker.runLocal('votes_locked', {})
    return { total: parseInt(m_tokenBalance), locked: parseInt(votes_locked) }
  }

  async smvClientsCount() {
    const locker = await this.getSmvLocker()
    const { m_num_clients } = await locker.runLocal('m_num_clients', {})
    return parseInt(m_num_clients)
  }

  async smvLockTokens(amount: number) {
    await this.run('lockVoting', { amount })
  }

  async smvEventVotes(platformId: string) {
    const locker = await this.getSmvLocker()
    const { value0 } = await this.runLocal(
      'clientAddressForProposal',
      {
        _tip3VotingLocker: locker.address,
        _platform_id: platformId,
      },
      undefined,
      { useCachedBoc: true },
    )
    const client = new SmvClient(this.client, value0)
    if (!(await client.isDeployed())) {
      return 0
    }

    const { value0: locked } = await client.runLocal('amount_locked', {})
    return parseInt(locked)
  }

  async smvVote(params: { platformId: string; choice: boolean; amount: number }) {
    const { platformId, choice, amount } = params
    await this.run('voteFor', {
      platform_id: platformId,
      choice,
      amount,
      note: '',
      num_clients: await this.smvClientsCount(),
    })
  }

  async createDaoMember(profile: string[]) {
    await this.run('startProposalForDeployWalletDao', {
      pubaddr: profile,
      num_clients: await this.smvClientsCount(),
    })
  }

  async deleteDaoMember(profile: string[]) {
    await this.run('startProposalForDeleteWalletDao', {
      pubaddr: profile,
      num_clients: await this.smvClientsCount(),
    })
  }

  async createRepository(params: {
    name: string
    prev?: { addr: string; version: string }
  }): Promise<void> {
    const { name, prev } = params
    await this.run('deployRepository', {
      nameRepo: name.toLowerCase(),
      previous: prev || null,
    })
  }

  async upgradeDao(version: string, options: { description?: string }) {
    const { description } = options
    await this.run('startProposalForUpgradeDao', {
      newversion: version,
      description: description ?? `Upgrade DAO to version ${version}`,
      num_clients: await this.smvClientsCount(),
    })
  }
}
