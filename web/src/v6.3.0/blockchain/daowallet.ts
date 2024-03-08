import { KeyPair, ResultOfProcessMessage, TonClient } from '@eversdk/core'
import { AppConfig } from '../../appconfig'
import { BaseContract } from '../../blockchain/contract'
import {
  MAX_PARALLEL_READ,
  MILESTONE_TAG,
  MILESTONE_TASK_TAG,
  SYSTEM_TAG,
} from '../../constants'
import { GoshError } from '../../errors'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk, sleep } from '../../utils'
import { TTaskAssignerData, TTaskGrant } from '../types/dao.types'
import { TGoshCommitTag } from '../types/repository.types'
import WalletABI from './abi/daowallet.abi.json'
import { SmvClient } from './smvclient'
import { SmvLocker } from './smvlocker'
import { GoshShapshot } from './snapshot'
import { UserProfile } from './userprofile'

export class DaoWallet extends BaseContract {
  constructor(client: TonClient, address: string, keys?: KeyPair) {
    super(client, WalletABI, address, { keys })
  }

  async isTurnedOn() {
    const details = await this.getDetails()
    return !!details.access
  }

  async isLimited() {
    const { _limited } = await this.runLocal('_limited', {})
    return _limited
  }

  async getDetails() {
    const data = await this.runLocal('getDetails', {})
    return {
      balance: {
        locked: parseInt(data.value0),
        pseudodao: parseInt(data.value1),
        pseudodaovote: parseInt(data.value2),
      },
      daoaddr: data.value3,
      rootpubaddr: data.value4,
      limit: parseInt(data.value5),
      pubaddr: data.value6,
      count: parseInt(data.value7),
      access: data.value8,
      tombstone: data.value9,
      expired: parseInt(data.value10),
    }
  }

  async getProfile() {
    const details = await this.getDetails()
    return new UserProfile(this.client, details.pubaddr)
  }

  async getSmvLocker() {
    const { tip3VotingLocker } = await this.runLocal('tip3VotingLocker', {}, undefined, {
      useCachedBoc: true,
    })
    return new SmvLocker(this.client, tip3VotingLocker)
  }

  async getBalance() {
    const details = await this.getDetails()
    const balance = await this.smvLockerBalance()
    return {
      regular: details.balance.pseudodao,
      voting: balance.total,
      locked: balance.locked + details.balance.locked,
      allowance: balance.total + details.balance.pseudodaovote,
    }
  }

  async getEventAddress(result: ResultOfProcessMessage) {
    const locker = await this.getSmvLocker()

    let static_cell = ''
    let depth = 0
    let msg_id = result.transaction.out_msgs[0]
    while (true) {
      const { result } = await this.account.client.net.query_collection({
        collection: 'messages',
        filter: { id: { eq: msg_id } },
        result: 'boc dst_transaction {out_messages {id}}',
      })
      if (
        !result.length ||
        !result[0].dst_transaction.out_messages.length ||
        depth === 9
      ) {
        return null
      }

      const decoded = await locker.decodeMessage(result[0].boc)
      if (decoded) {
        static_cell = decoded.value.staticCell
        break
      }

      msg_id = result[0].dst_transaction.out_messages[0].id
      depth += 1
    }

    const prop_id = await AppConfig.goshroot.getEventPropIdFromCell(static_cell)
    const { value0 } = await this.runLocal(
      'proposalAddressByAccount',
      { acc: this.address, propId: prop_id },
      undefined,
      { useCachedBoc: true },
    )
    return value0 as string
  }

  async setRepositoriesUpgraded(): Promise<void> {
    await this.run('setRepoUpgraded', { res: true })
  }

  async setTasksUpgraded(params: { cell?: boolean | undefined }) {
    const { cell } = params

    if (cell) {
      const { value0 } = await this.runLocal('getCellForRedeployedTask', {
        time: null,
      })
      return value0
    } else {
      await this.run('setRedeployedTask', {})
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

  async smvCheckEvent(address: string) {
    await this.run('tryProposalResult', { proposal: address })
  }

  async createDaoMember(params: {
    members: {
      profile: string
      allowance: number
      expired: number
    }[]
    daonames?: (string | null)[]
    comment?: string
    reviewers?: string[]
    cell?: boolean
    alone?: boolean
  }) {
    const {
      members = [],
      daonames = [],
      comment = '',
      reviewers = [],
      cell,
      alone,
    } = params

    const aloneParams = {
      pubaddr: members.map(({ profile, allowance, expired }) => ({
        member: profile,
        count: allowance,
        expired,
      })),
      dao: daonames,
    }
    const cellParams = { ...aloneParams, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeployWalletDao', cellParams)
      return value0 as string
    } else if (alone) {
      await this.run('AloneDeployWalletDao', aloneParams)
      return null
    } else {
      const result = await this.run('startProposalForDeployWalletDao', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
      return await this.getEventAddress(result)
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
      return value0 as string
    } else {
      const cell: any = await this.deleteDaoMember({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else {
      const cell: any = await this.updateDaoMemberAllowance({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async createRepository(params: {
    name: string
    description?: string
    previous?: {
      addr: string
      version: string
    }
    expert_tags?: string[]
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
      expert_tags = [],
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
      return value0 as string
    } else if (alone) {
      await this.run('AloneDeployRepository', deployParams)
      return null
    } else {
      const cell: any = await this.createRepository({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers, expert_tags })
    }
  }

  async createCommitTag(tag: TGoshCommitTag) {
    await this.run('deployTag', {
      repoName: tag.reponame,
      nametag: tag.name,
      nameCommit: tag.commit.name,
      content: tag.content,
      commit: tag.commit.address,
      isHack: tag.is_hack,
      branchname: tag.branch_name,
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
      return value0 as string
    } else {
      const cell: any = await this.upgradeDao({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else {
      const cell: any = await this.updateDaoAskMembership({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else {
      const cell: any = await this.updateDaoEventShowProgress({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else {
      const cell: any = await this.updateDaoEventAllowDiscussion({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else if (alone) {
      await this.run('AloneMintDaoReserve', aloneParams)
      return null
    } else {
      const cell: any = await this.mintDaoTokens({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else if (alone) {
      await this.run('AloneNotAllowMint', {})
      return null
    } else {
      const cell: any = await this.disableMintDaoTokens({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else if (alone) {
      await this.run('AloneAddVoteTokenDao', { grant: amount })
      return null
    } else {
      const cell: any = await this.addDaoVotingTokens({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else if (alone) {
      await this.run('AloneAddTokenDao', { grant: amount })
      return null
    } else {
      const cell: any = await this.addDaoRegularTokens({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else if (alone) {
      await this.run('AloneDeployDaoTag', aloneParams)
      return null
    } else {
      const cell: any = await this.createDaoTag({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else {
      const cell: any = await this.deleteDaoTag({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async createMilestone(params: {
    reponame: string
    taskname: string
    grant: TTaskGrant
    assigners: TTaskAssignerData
    budget: number
    tags?: string[]
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const {
      reponame,
      taskname,
      grant,
      assigners,
      budget,
      tags = [],
      comment = '',
      reviewers = [],
      cell,
    } = params

    const tagList = [MILESTONE_TAG, ...tags]
    const cellParams = {
      repoName: reponame,
      taskName: taskname,
      grant,
      assignersdata: {
        task: assigners.taskaddr,
        pubaddrassign: assigners.assigner,
        pubaddrreview: assigners.reviewer,
        pubaddrmanager: assigners.manager,
        daoMembers: assigners.daomember,
      },
      freebalance: budget,
      tag: tagList,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellBigTaskDeploy', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.createMilestone({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async deleteMilestone(params: {
    reponame: string
    taskname: string
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, taskname, comment = '', reviewers = [], cell } = params

    const cellParams = { repoName: reponame, taskName: taskname, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellBigTaskDestroy', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.deleteMilestone({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async completeMilestone(params: {
    reponame: string
    taskname: string
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, taskname, comment = '', reviewers = [], cell } = params

    const cellParams = { repoName: reponame, taskName: taskname, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellTaskConfirm', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.completeMilestone({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async createMilestoneTask(params: {
    milename: string
    reponame: string
    taskname: string
    grant: TTaskGrant
    amount: number
    tags?: string[]
  }) {
    const { milename, reponame, taskname, grant, amount, tags = [] } = params

    const tagList = [MILESTONE_TASK_TAG, ...tags]
    await this.run('deploySubTask', {
      namebigtask: milename,
      repoName: reponame,
      nametask: taskname,
      grant,
      value: amount,
      hashtag: tagList,
    })
  }

  async deleteMilestoneTask(params: {
    milename: string
    reponame: string
    index: number
  }) {
    const { milename, reponame, index } = params
    await this.run('destroySubTask', {
      namebigtask: milename,
      repoName: reponame,
      index,
    })
  }

  async receiveMilestoneReward(params: { reponame: string; taskname: string }) {
    const { reponame, taskname } = params
    await this.run('askGrantBigTokenFull', {
      repoName: reponame,
      nametask: taskname,
    })
  }

  async upgradeMilestone(params: {
    reponame: string
    taskname: string
    taskprev: {
      address: string
      version: string
    }
    tags: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const {
      reponame,
      taskname,
      taskprev,
      tags,
      comment = '',
      reviewers = [],
      cell,
    } = params

    const cellParams = {
      reponame,
      nametask: taskname,
      oldversion: taskprev.version,
      oldtask: taskprev.address,
      hashtag: tags,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellForBigTaskUpgrade', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.upgradeMilestone({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async createTask(params: {
    reponame: string
    taskname: string
    config: TTaskGrant
    team?: TTaskAssignerData
    tags?: string[]
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const {
      reponame,
      taskname,
      config,
      team,
      tags = [],
      comment = '',
      reviewers = [],
      cell,
    } = params

    const tagList = [SYSTEM_TAG, ...tags]
    const team_struct = team
      ? {
          task: team.taskaddr,
          pubaddrassign: team.assigner,
          pubaddrreview: team.reviewer,
          pubaddrmanager: team.manager,
          daoMembers: team.daomember,
        }
      : undefined
    const cellParams = {
      repoName: reponame,
      taskName: taskname,
      grant: config,
      workers: team_struct,
      tag: tagList,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellTaskDeploy', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.createTask({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
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
      return value0 as string
    } else {
      const cell: any = await this.deleteTask({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async receiveTaskReward(params: { reponame: string; taskname: string }) {
    const { reponame, taskname } = params
    await this.run('askGrantTokenFull', {
      repoName: reponame,
      nametask: taskname,
    })
  }

  async transferTask(params: { accountData: any; reponame: string }) {
    const { accountData, reponame } = params

    const constructorParams = {
      nametask: accountData._nametask,
      repoName: reponame,
      ready: accountData._ready,
      candidates: accountData._candidates.map((item: any) => ({
        ...item,
        daoMembers: {},
      })),
      grant: accountData._grant,
      hashtag: accountData._hashtag,
      indexFinal: accountData._indexFinal,
      locktime: accountData._locktime,
      fullAssign: accountData._fullAssign,
      fullReview: accountData._fullReview,
      fullManager: accountData._fullManager,
      assigners: accountData._assigners,
      reviewers: accountData._reviewers,
      managers: accountData._managers,
      assignfull: accountData._assignfull,
      reviewfull: accountData._reviewfull,
      managerfull: accountData._managerfull,
      assigncomplete: accountData._assigncomplete,
      reviewcomplete: accountData._reviewcomplete,
      managercomplete: accountData._managercomplete,
      allassign: accountData._allassign,
      allreview: accountData._allreview,
      allmanager: accountData._allmanager,
      lastassign: accountData._lastassign,
      lastreview: accountData._lastreview,
      lastmanager: accountData._lastmanager,
      balance: accountData._balance,
    }

    const { value0: cell } = await this.runLocal('getCellForTask', constructorParams)
    const { value0 } = await this.runLocal('getCellForRedeployTask', {
      reponame: constructorParams.repoName,
      nametask: constructorParams.nametask,
      hashtag: constructorParams.hashtag,
      data: cell,
      time: null,
    })
    return value0
  }

  async upgradeTask(params: {
    reponame: string
    taskname: string
    taskprev: {
      address: string
      version: string
    }
    tags: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const {
      reponame,
      taskname,
      taskprev,
      tags,
      comment = '',
      reviewers = [],
      cell,
    } = params

    const cellParams = {
      reponame,
      nametask: taskname,
      oldversion: taskprev.version,
      oldtask: taskprev.address,
      hashtag: tags,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellForTaskUpgrade', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.upgradeTask({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async createRepositoryTag(params: {
    reponame: string
    tags: string[]
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, tags, comment = '', reviewers = [], cell } = params

    const cellParams = { repo: reponame, tag: tags, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAddRepoTag', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.createRepositoryTag({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async deleteRepositoryTag(params: {
    reponame: string
    tags: string[]
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, tags, comment = '', reviewers = [], cell } = params

    const cellParams = { repo: reponame, tag: tags, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDestroyRepoTag', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.deleteRepositoryTag({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async updateRepositoryDescription(params: {
    reponame: string
    description: string
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, description, comment = '', reviewers = [], cell } = params

    const cellParams = { repoName: reponame, descr: description, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellChangeDescription', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.updateRepositoryDescription({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async updateRepositoryMetadata(params: {
    reponame: string
    metadata: object
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, metadata, comment = '', reviewers = [], cell } = params

    const cellParams = { nameRepo: reponame, metadata: JSON.stringify(metadata), comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellMetadataRepo', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.updateRepositoryMetadata({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async receiveTaskRewardAsDao(params: {
    wallet: string
    reponame: string
    taskname: string
    comment?: string
    reviewers?: string[]
    cell?: boolean
  }) {
    const { wallet, reponame, taskname, comment = '', reviewers = [], cell } = params

    const cellParams = {
      wallet,
      repoName: reponame,
      taskName: taskname,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellForDaoAskGrant', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.receiveTaskRewardAsDao({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async upgradeVersionController(params: {
    code: string
    data: string
    comment?: string
    reviewers?: string[]
  }) {
    const { code, data, comment = '', reviewers = [] } = params

    const cellParams = { UpgradeCode: code, cell: data, comment }
    const result = await this.run('startProposalForUpgradeVersionController', {
      ...cellParams,
      reviewers,
      num_clients: await this.smvClientsCount(),
    })
    return await this.getEventAddress(result)
  }

  async setCommit(params: {
    repo_name: string
    branch_name: string
    commit_name: string
    num_files: number
    num_commits: number
    task?: any
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { comment = '', reviewers = [], cell } = params

    const cellParams = {
      repoName: params.repo_name,
      branchName: params.branch_name,
      commit: params.commit_name,
      numberChangedFiles: params.num_files,
      numberCommits: params.num_commits,
      task: params.task,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellSetCommit', cellParams)
      return value0 as string
    } else {
      const result = await this.run('startProposalForSetCommit', {
        ...cellParams,
        reviewers,
        num_clients: await this.smvClientsCount(),
      })
      return await this.getEventAddress(result)
    }
  }

  async createRepositoryBranch(params: {
    repo_name: string
    branch_name: string
    from_commit: string
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { comment = '', reviewers = [], cell } = params

    const cellParams = {
      repoName: params.repo_name,
      newName: params.branch_name,
      fromCommit: params.from_commit,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeployBranch', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.createRepositoryBranch({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async lockRepositoryBranch(params: {
    repo_name: string
    branch_name: string
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { comment = '', reviewers = [], cell } = params

    const cellParams = {
      repoName: params.repo_name,
      branchName: params.branch_name,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAddProtectedBranch', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.lockRepositoryBranch({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async issueRepositoryToken(params: {
    reponame: string
    token: {
      name: string
      symbol: string
      decimals: number
      description: object
    }
    grant: { pubaddr: string; amount: number }[]
    reviewers?: string[]
    comment?: string
    cell?: boolean
  }) {
    const { reponame, token, grant, comment = '', reviewers = [], cell } = params

    const cellParams = {
      repoName: reponame,
      tokendescription: JSON.stringify(token.description),
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      tokengrants: grant.map(({ pubaddr, amount }) => ({ pubaddr, value: amount })),
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellForStartToken', cellParams)
      return value0 as string
    } else {
      const cell: any = await this.issueRepositoryToken({ ...params, cell: true })
      return await this.createSingleEvent({ cell, reviewers })
    }
  }

  async createDaoExpertTag(params: {
    tags: { name: string; multiplier: number }[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { tags, comment, reviewers, cell } = params

    const cell_params = {
      tags: tags.map(({ name }) => name),
      multiples: tags.map(({ multiplier }) => multiplier),
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellCreateTagForDaoMembers', cell_params)
      return value0 as string
    } else {
      const cell_data: any = await this.createDaoExpertTag({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async deleteDaoExpertTag(params: {
    tags: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { tags, comment, reviewers, cell } = params

    const cell_params = { tags, comment }

    if (cell) {
      const { value0 } = await this.runLocal(
        'getCellDestroyTagForDaoMembers',
        cell_params,
      )
      return value0 as string
    } else {
      const cell_data: any = await this.deleteDaoExpertTag({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async createDaoMemberExpertTag(params: {
    items: { profile_addr: string; tag: string }[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { items, comment, reviewers, cell } = params

    const cell_params = {
      pubaddr: items.map(({ profile_addr }) => profile_addr),
      tags: items.map(({ tag }) => tag),
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeployTagForDaoMembers', cell_params)
      return value0 as string
    } else {
      const cell_data: any = await this.createDaoMemberExpertTag({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async deleteDaoMemberExpertTag(params: {
    item: { profile_addr: string; tag: string }
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { item, comment, reviewers, cell } = params

    const cell_params = { pubaddr: [item.profile_addr], tag: item.tag, comment }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeleteTagForDaoMembers', cell_params)
      return value0 as string
    } else {
      const cell_data: any = await this.deleteDaoMemberExpertTag({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async createHackathon(params: {
    name: string
    metadata: {
      branch_name: string
      dates: { start: number; voting: number; finish: number }
      description: string
    }
    prize_distribution: number[]
    prize_wallets: string[]
    expert_tags?: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const {
      name,
      metadata,
      prize_distribution,
      prize_wallets,
      expert_tags = [],
      comment,
      reviewers,
      cell,
    } = params

    const cell_params = {
      name,
      metadata: JSON.stringify(metadata),
      grants: prize_distribution,
      tip3wallet: prize_wallets,
      tags: expert_tags,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellDeployGrants', cell_params)
      return value0 as string
    } else {
      const cell_data: any = await this.createHackathon({ ...params, cell: true })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async updateHackathon(params: {
    name: string
    metadata?: {
      branch_name: string
      dates: { start: number; voting: number; finish: number }
      description: string
    }
    prize_distribution?: number[]
    prize_wallets?: string[]
    expert_tags?: string[]
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const {
      name,
      metadata,
      prize_distribution = null,
      prize_wallets = null,
      expert_tags = null,
      comment,
      reviewers,
      cell,
    } = params

    const cell_params = {
      name,
      metadata: metadata ? JSON.stringify(metadata) : null,
      grants: prize_distribution,
      tip3wallet: prize_wallets,
      tags: expert_tags,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellAddCurrencies', cell_params)
      return value0 as string
    } else {
      const cell_data: any = await this.updateHackathon({ ...params, cell: true })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async approveHackathonApps(params: {
    name: string
    applications: {
      dao_address: string
      dao_name: string
      repo_name: string
    }[]
    finish: number
    comment?: string
    reviewers?: string[]
    cell?: boolean | undefined
  }) {
    const { name, applications, finish, comment, reviewers, cell } = params

    const cell_params = {
      name,
      owners: applications.map(({ dao_address }) => dao_address),
      details: applications.map(({ dao_name, repo_name }) => {
        return JSON.stringify({ dao_name, repo_name })
      }),
      timeofend: finish,
      comment,
    }

    if (cell) {
      const { value0 } = await this.runLocal('getCellSetGrantOwners', cell_params)
      return value0 as string
    } else {
      const cell_data: any = await this.approveHackathonApps({
        ...params,
        cell: true,
      })
      return await this.createSingleEvent({ cell: cell_data, reviewers })
    }
  }

  async voteForHackathonApp(params: {
    hack_name: string
    app_index: number
    value: number
    comment?: string
  }) {
    const { hack_name, app_index, value, comment = '' } = params
    await this.run('voteForHacks', {
      amount: value,
      index: app_index,
      name: hack_name,
      comment,
    })
  }

  async createSingleEvent(params: {
    cell: string
    reviewers?: string[]
    expert_tags?: string[]
  }) {
    const { cell, reviewers = [], expert_tags = [] } = params

    const result = await this.run('startOneProposal', {
      proposal: cell,
      reviewers,
      num_clients: await this.smvClientsCount(),
      data: expert_tags,
    })
    return await this.getEventAddress(result)
  }

  async createMultiEvent(params: {
    proposals: { type: EDaoEventType; params: any }[]
    comment?: string
    reviewers?: string[]
  }) {
    const { proposals, comment, reviewers = [] } = params

    // Prepare cells
    const { cell, count } = await this.createMultiEventData(proposals)

    // Create proposal
    const result = await this.run('startMultiProposal', {
      number: count,
      proposals: cell,
      reviewers,
      comment,
      num_clients: await this.smvClientsCount(),
    })
    return await this.getEventAddress(result)
  }

  async getSnapshot(params: {
    address?: string
    data?: { commit_name: string; repo_addr: string; filename: string }
  }) {
    const { address, data } = params

    if (!address && !data) {
      throw new GoshError('Value error', 'Data or address not passed')
    }

    let _address = address
    if (!_address) {
      const { commit_name, repo_addr, filename } = data!
      const { value0 } = await this.runLocal(
        'getSnapshotAddr',
        { commitSha: commit_name, repo: repo_addr, name: filename },
        undefined,
        { useCachedBoc: true },
      )
      _address = value0
    }

    return new GoshShapshot(this.client, _address!)
  }

  async createSnapshot(params: {
    commit_name: string
    repo_addr: string
    filename: string
    content: string
    ipfs_url?: string
    is_pin: boolean
  }) {
    const { commit_name, repo_addr, filename, content, ipfs_url, is_pin } = params
    await this.run('deployNewSnapshot', {
      commitsha: commit_name,
      repo: repo_addr,
      name: filename,
      snapshotdata: content,
      snapshotipfs: ipfs_url,
      isPin: is_pin,
    })
  }

  /**
   * Private methods
   */
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
        if (type === EDaoEventType.REPO_TAG_ADD) {
          return await this.createRepositoryTag({ ...params, cell: true })
        }
        if (type === EDaoEventType.REPO_TAG_REMOVE) {
          return await this.deleteRepositoryTag({ ...params, cell: true })
        }
        if (type === EDaoEventType.REPO_UPDATE_DESCRIPTION) {
          return await this.updateRepositoryDescription({
            ...params,
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
        if (type === EDaoEventType.DELAY) {
          const { value0 } = await this.runLocal('getCellDelay', {})
          return value0
        }
        if (type === EDaoEventType.TASK_REDEPLOY) {
          return await this.transferTask(params)
        }
        if (type === EDaoEventType.TASK_UPGRADE) {
          return await this.upgradeTask({ ...params, cell: true })
        }
        if (type === EDaoEventType.TASK_REDEPLOYED) {
          return await this.setTasksUpgraded({ ...params, cell: true })
        }
        if (type === EDaoEventType.MILESTONE_CREATE) {
          return await this.createMilestone({ ...params, cell: true })
        }
        if (type === EDaoEventType.MILESTONE_DELETE) {
          return await this.deleteMilestone({ ...params, cell: true })
        }
        if (type === EDaoEventType.MILESTONE_COMPLETE) {
          return await this.completeMilestone({ ...params, cell: true })
        }
        if (type === EDaoEventType.MILESTONE_UPGRADE) {
          return await this.upgradeMilestone({ ...params, cell: true })
        }
        if (type === EDaoEventType.PULL_REQUEST) {
          return await this.setCommit({ ...params, cell: true })
        }
        if (type === EDaoEventType.BRANCH_LOCK) {
          return await this.lockRepositoryBranch({ ...params, cell: true })
        }
        if (type === EDaoEventType.DAO_EXPERT_TAG_CREATE) {
          return await this.createDaoExpertTag({ ...params, cell: true })
        }
        if (type === EDaoEventType.DAO_EXPERT_TAG_DELETE) {
          return await this.deleteDaoExpertTag({ ...params, cell: true })
        }
        if (type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_CREATE) {
          return await this.createDaoMemberExpertTag({ ...params, cell: true })
        }
        if (type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_DELETE) {
          return await this.deleteDaoMemberExpertTag({ ...params, cell: true })
        }
        if (type === EDaoEventType.HACKATHON_CREATE) {
          return await this.createHackathon({ ...params, cell: true })
        }
        if (type === EDaoEventType.HACKATHON_UPDATE) {
          return await this.updateHackathon({ ...params, cell: true })
        }
        if (type === EDaoEventType.BRANCH_CREATE) {
          return await this.createRepositoryBranch({ ...params, cell: true })
        }
        if (type === EDaoEventType.HACKATHON_APPS_APPROVE) {
          return await this.approveHackathonApps({ ...params, cell: true })
        }
        if (type === EDaoEventType.REPO_UPDATE_METADATA) {
          return await this.updateRepositoryMetadata({ ...params, cell: true })
        }
        if (type === EDaoEventType.REPO_ISSUE_TOKEN) {
          return await this.issueRepositoryToken({ ...params, cell: true })
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
