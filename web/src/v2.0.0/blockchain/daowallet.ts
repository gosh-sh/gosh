import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { MAX_PARALLEL_READ, SYSTEM_TAG } from '../../constants'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk, sleep } from '../../utils'
import { ETaskReward, TTaskGrant } from '../types/dao.types'
import { TGoshCommitTag } from '../types/repository.types'
import WalletABI from './abi/daowallet.abi.json'
import { SmvClient } from './smvclient'
import { SmvLocker } from './smvlocker'
import { UserProfile } from './userprofile'

export class DaoWallet extends BaseContract {
  constructor(client: TonClient, address: string, keys?: KeyPair) {
    super(client, WalletABI, address, { keys })
  }

  async isTurnedOn() {
    const { value0 } = await this.runLocal('getAccess', {})
    return !!value0
  }

  async isLimited() {
    const { _limited } = await this.runLocal('_limited', {})
    return _limited
  }

  async getProfile() {
    const { value0 } = await this.runLocal('getWalletOwner', {}, undefined, {
      useCachedBoc: true,
    })
    return new UserProfile(this.client, value0)
  }

  async getSmvLocker() {
    const { tip3VotingLocker } = await this.runLocal('tip3VotingLocker', {}, undefined, {
      useCachedBoc: true,
    })
    return new SmvLocker(this.client, tip3VotingLocker)
  }

  async getBalance() {
    const { m_pseudoDAOBalance } = await this.runLocal('m_pseudoDAOBalance', {})
    const { m_pseudoDAOVoteBalance } = await this.runLocal('m_pseudoDAOVoteBalance', {})
    const balance = await this.smvLockerBalance()
    return {
      regular: parseInt(m_pseudoDAOBalance),
      voting: balance.total,
      locked: balance.locked,
      allowance: balance.total + parseInt(m_pseudoDAOVoteBalance),
    }
  }

  async setRepositoriesUpgraded(): Promise<void> {
    await this.run('setRepoUpgraded', { res: true })
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

  async smvUnlockTokens(amount: number): Promise<void> {
    await this.run('unlockVoting', { amount })
  }

  async smvReleaseTokens() {
    const balance = await this.account.getBalance()
    if (parseInt(balance, 16) > 5000 * 10 ** 9) {
      await this.run('updateHead', {})
    }
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

  async createDaoMember(params: {
    members: {
      profile: string
      allowance: number
    }[]
    comment?: string
    reviewers?: string[]
    cell?: boolean
    alone?: boolean
  }) {
    const { members = [], comment = '', reviewers = [], cell, alone } = params

    const aloneParams = {
      pubaddr: members.map(({ profile, allowance }) => ({
        member: profile,
        count: allowance,
      })),
    }
    const cellParams = { ...aloneParams, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeployWalletDao', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneDeployWalletDao', aloneParams)
    } else {
      await this.run('startProposalForDeployWalletDao', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async deleteDaoMember(params: {
    profile: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { profile, comment = '', reviewers = [], cell } = params

    const cellParams = { pubaddr: profile, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeleteWalletDao', cellParams)
      return value0
    } else {
      await this.run('startProposalForDeleteWalletDao', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async updateDaoMemberAllowance(params: {
    members: {
      profile: string
      increase: boolean
      amount: number
    }[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { members, comment = '', reviewers = [], cell } = params

    const cellParams = {
      pubaddr: members.map(({ profile }) => profile),
      increase: members.map(({ increase }) => increase),
      grant: members.map(({ amount }) => amount),
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellChangeAllowance', cellParams)
      return value0
    } else {
      await this.run('startProposalForChangeAllowance', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async createRepository(params: {
    name: string
    description?: string
    previous?: {
      addr: string
      version: string
    }
    comment?: string
    reviewers?: string[]
    alone?: boolean
    cell?: boolean
  }) {
    const {
      name,
      previous,
      comment = '',
      description = '',
      reviewers = [],
      alone,
      cell,
    } = params

    const deployParams = {
      nameRepo: name.toLowerCase(),
      descr: description,
      previous: previous || null,
    }
    const cellParams = { ...deployParams, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeployRepo', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneDeployRepository', deployParams)
    } else {
      await this.run('startProposalForDeployRepository', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async createCommitTag(tag: TGoshCommitTag) {
    await this.run('deployTag', {
      repoName: tag.reponame,
      nametag: tag.name,
      nameCommit: tag.commit.name,
      content: tag.content,
      commit: tag.commit.address,
    })
  }

  async deleteCommitTag(params: { reponame: string; tagname: string }) {
    const { reponame, tagname } = params
    await this.run('deleteTag', { repoName: reponame, nametag: tagname })
  }

  async sendDaoEventReview(params: { eventaddr: string; decision: boolean }) {
    const { eventaddr, decision } = params

    const fn = decision ? 'acceptReviewer' : 'rejectReviewer'
    await this.run(fn, { propAddress: eventaddr })
  }

  async upgradeDao(params: {
    version: string
    description?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { version, reviewers = [], cell } = params

    const comment = params.description ?? `Upgrade DAO to version ${version}`
    const cellParams = {
      newversion: version,
      description: comment,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellSetUpgrade', cellParams)
      return value0
    } else {
      await this.run('startProposalForUpgradeDao', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async updateDaoAskMembership(params: {
    decision: boolean
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { decision, comment = '', reviewers = [], cell } = params

    const cellParams = { res: decision, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellSetAbilityInvite', cellParams)
      return value0
    } else {
      await this.run('startProposalForSetAbilityInvite', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async updateDaoEventShowProgress(params: {
    decision: boolean
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { decision, comment = '', reviewers = [], cell } = params

    const cellParams = { res: !decision, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellSetHideVotingResult', cellParams)
      return value0
    } else {
      await this.run('startProposalForSetHideVotingResult', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async updateDaoEventAllowDiscussion(params: {
    allow: boolean
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { allow, comment = '', reviewers = [], cell } = params

    const cellParams = { res: allow, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellSetAllowDiscussion', cellParams)
      return value0
    } else {
      await this.run('startProposalForSetAllowDiscussion', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async mintDaoTokens(params: {
    amount: number
    comment?: string
    reviewers?: string[]
    alone?: boolean
    cell?: boolean
  }) {
    const { amount, comment = '', reviewers = [], alone, cell } = params

    const aloneParams = { token: amount }
    const cellParams = { ...aloneParams, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellMintToken', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneMintDaoReserve', aloneParams)
    } else {
      await this.run('startProposalForMintDaoReserve', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async disableMintDaoTokens(params: {
    comment?: string
    reviewers?: string[]
    alone?: boolean
    cell?: boolean
  }) {
    const { comment = '', reviewers = [], alone, cell } = params

    const cellParams = { comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAllowMint', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneNotAllowMint', {})
    } else {
      await this.run('startProposalForNotAllowMint', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async addDaoVotingTokens(params: {
    profile: string
    amount: number
    comment?: string
    reviewers?: string[]
    alone?: boolean | undefined
    cell?: boolean | undefined
  }) {
    const { profile, amount, comment = '', reviewers = [], alone, cell } = params

    const cellParams = { pubaddr: profile, token: amount, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAddVoteToken', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneAddVoteTokenDao', { grant: amount })
    } else {
      await this.run('startProposalForAddVoteToken', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async addDaoRegularTokens(params: {
    profile: string
    amount: number
    comment?: string
    reviewers?: string[]
    alone?: boolean | undefined
    cell?: boolean | undefined
  }) {
    const { profile, amount, comment = '', reviewers = [], alone, cell } = params

    const cellParams = { pubaddr: profile, token: amount, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAddRegularToken', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneAddTokenDao', { grant: amount })
    } else {
      await this.run('startProposalForAddRegularToken', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async sendTokensToDaoReserve(amount: number) {
    await this.run('sendTokenToDaoReserve', { grant: amount })
  }

  async sendTokensToDaoWallet(profile: string, amount: number): Promise<void> {
    await this.run('sendToken', { pubaddr: profile, grant: amount })
  }

  async sendTokensToUpgradedDao(amount: number, version: string) {
    await this.run('sendTokenToNewVersion', { grant: amount, newversion: version })
  }

  async createDaoTag(params: {
    tags: string[]
    comment?: string
    reviewers?: string[]
    alone?: boolean
    cell?: boolean
  }) {
    const { tags, comment = '', reviewers = [], alone, cell } = params

    const clean = tags
      .filter((item) => !!item.trim().length)
      .map((item) => {
        return item.startsWith('#') ? item.slice(1) : item
      })
    const aloneParams = { tag: clean }
    const cellParams = { ...aloneParams, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAddDaoTag', cellParams)
      return value0
    } else if (alone) {
      await this.run('AloneDeployDaoTag', aloneParams)
    } else {
      await this.run('startProposalForAddDaoTag', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async deleteDaoTag(params: {
    tags: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { tags, comment = '', reviewers = [], cell } = params

    const clean = tags
      .filter((item) => !!item.trim().length)
      .map((item) => {
        return item.startsWith('#') ? item.slice(1) : item
      })
    const cellParams = { tag: clean, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDestroyDaoTag', cellParams)
      return value0
    } else {
      await this.run('startProposalForDestroyDaoTag', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async createTask(params: {
    reponame: string
    taskname: string
    config: TTaskGrant
    tags?: string[]
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const {
      reponame,
      taskname,
      config,
      tags = [],
      comment = '',
      reviewers = [],
      cell,
    } = params

    const tagList = [SYSTEM_TAG, ...tags]
    const cellParams = {
      repoName: reponame,
      taskName: taskname,
      grant: config,
      tag: tagList,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellTaskDeploy', cellParams)
      return value0
    } else {
      await this.run('startProposalForTaskDeploy', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async deleteTask(params: {
    reponame: string
    taskname: string
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { reponame, taskname, comment = '', reviewers = [], cell } = params

    const cellParams = { repoName: reponame, taskName: taskname, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellTaskDestroy', cellParams)
      return value0
    } else {
      await this.run('startProposalForTaskDestroy', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
    }
  }

  async receiveTaskReward(params: {
    reponame: string
    taskname: string
    type: ETaskReward
  }) {
    const { reponame, taskname, type } = params
    await this.run('askGrantToken', {
      repoName: reponame,
      nametask: taskname,
      typegrant: type,
    })
  }

  async createMultiEvent(params: {
    proposals: { type: EDaoEventType; params: any }[]
    comment?: string
    reviewers?: string[]
  }): Promise<void> {
    const { proposals, comment, reviewers = [] } = params

    // Prepare cells
    const { cell, count } = await this.createMultiEventData(proposals)

    // Create proposal
    await this.run('startMultiProposal', {
      number: count,
      proposals: cell,
      reviewers,
      comment,
      num_clients: await this.smvClientsCount(),
    })
  }

  private async createMultiEventData(proposals: { type: EDaoEventType; params: any }[]) {
    // Prepare cells
    const cells = await executeByChunk(
      proposals,
      MAX_PARALLEL_READ,
      async ({ type, params }) => {
        if (type === EDaoEventType.REPO_CREATE) {
          return await this.createRepository({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_MEMBER_ADD) {
          return await this.createDaoMember({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_MEMBER_DELETE) {
          return await this.deleteDaoMember({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_UPGRADE) {
          return await this.upgradeDao({ ...params, cell: true })
        }
        if (type === EDaoEventType.DAO_TOKEN_VOTING_ADD) {
          return await this.addDaoVotingTokens({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_TOKEN_REGULAR_ADD) {
          return await this.addDaoRegularTokens({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_TOKEN_MINT) {
          return await this.mintDaoTokens({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_TOKEN_MINT_DISABLE) {
          return await this.disableMintDaoTokens({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_TAG_ADD) {
          return await this.createDaoTag({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_TAG_REMOVE) {
          return await this.deleteDaoTag({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_ALLOWANCE_CHANGE) {
          return await this.updateDaoMemberAllowance({ ...params, cell: true })
        }
        if (type === EDaoEventType.DAO_EVENT_ALLOW_DISCUSSION) {
          return await this.updateDaoEventAllowDiscussion({
            ...params,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_EVENT_HIDE_PROGRESS) {
          return await this.updateDaoEventShowProgress({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE) {
          return await this.updateDaoAskMembership({
            ...params,
            alone: false,
            cell: true,
          })
        }
        if (type === EDaoEventType.TASK_CREATE) {
          return await this.createTask({ ...params, cell: true })
        }
        if (type === EDaoEventType.TASK_DELETE) {
          return await this.deleteTask({ ...params, cell: true })
        }
        return null
      },
    )

    // Compose cells
    const clean = cells.filter((cell) => typeof cell === 'string')
    const count = clean.length
    for (let i = clean.length - 1; i > 0; i--) {
      const cellA = clean[i - 1]
      const cellB = clean[i]
      const { value0 } = await this.runLocal('AddCell', {
        data1: cellA,
        data2: cellB,
      })
      clean.splice(i - 1, 2, value0)
      await sleep(50)
    }

    return { cell: clean[0], count }
  }
}
