import { TonClient } from '@eversdk/core'
import _ from 'lodash'
import { AppConfig } from '../../appconfig'
import { BaseContract } from '../../blockchain/contract'
import {
  DaoEventType,
  MAX_PARALLEL_READ,
  MILESTONE_TAG,
  SYSTEM_TAG,
} from '../../constants'
import { GoshError } from '../../errors'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk, sleep } from '../../utils'
import { EDaoMemberType, TDaoEventReviewer, TTaskGrantPair } from '../types/dao.types'
import SmvEventABI from './abi/smvproposal.abi.json'
import { DaoWallet } from './daowallet'
import { getDaoOrProfile } from './helpers'

export class DaoEvent extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, SmvEventABI, address)
  }

  async getDetails(params: { wallet?: DaoWallet | null }) {
    const { wallet } = params
    const details = await this.runLocal('getDetails', {})

    const type = parseInt(details.value0)
    const platform_id = details.value8
    const time = {
      start: parseInt(details.value2) * 1000,
      finish: parseInt(details.value3) * 1000,
      completed: parseInt(details.value4) * 1000,
    }
    const status = {
      completed: details.value1 !== null,
      accepted: !!details.value1,
    }
    const votes = {
      yes: parseInt(details.value5),
      no: parseInt(details.value6),
      yours: wallet ? await wallet.smvEventVotes(platform_id) : 0,
      total: parseInt(details.value7),
    }

    const reviewers = await executeByChunk(
      Object.keys(details.value9),
      MAX_PARALLEL_READ,
      async (walletaddr: string) => {
        const wallet = new DaoWallet(this.client, walletaddr)
        const profile = await wallet.getProfile()
        return {
          username: await profile.getName(),
          usertype: 'user',
          profile: profile.address,
        }
      },
    )

    return {
      platformId: platform_id,
      type,
      label: DaoEventType[type],
      time,
      status,
      votes,
      reviewers: reviewers as TDaoEventReviewer[],
    }
  }

  async getData(type: number, options: { verbose?: boolean } = {}): Promise<any> {
    const { verbose } = options

    let fn: string = ''
    let parser
    if (type === EDaoEventType.DAO_UPGRADE) {
      fn = 'getGoshUpgradeDaoProposalParams'
    } else if (type === EDaoEventType.DAO_MEMBER_ADD) {
      fn = 'getGoshDeployWalletDaoProposalParams'
      parser = this.parseMemberAddEventParams
    } else if (type === EDaoEventType.DAO_MEMBER_DELETE) {
      fn = 'getGoshDeleteWalletDaoProposalParams'
      parser = this.parseMemberDeleteEventParams
    } else if (type === EDaoEventType.BRANCH_LOCK) {
      fn = 'getGoshAddProtectedBranchProposalParams'
    } else if (type === EDaoEventType.BRANCH_UNLOCK) {
      fn = 'getGoshDeleteProtectedBranchProposalParams'
    } else if (type === EDaoEventType.PULL_REQUEST) {
      fn = 'getGoshSetCommitProposalParams'
    } else if (type === EDaoEventType.DAO_CONFIG_CHANGE) {
      fn = 'getGoshSetConfigDaoProposalParams'
    } else if (type === EDaoEventType.REPO_CREATE) {
      fn = 'getGoshDeployRepoProposalParams'
    } else if (type === EDaoEventType.TASK_DELETE) {
      fn = 'getGoshDestroyTaskProposalParams'
    } else if (type === EDaoEventType.TASK_CREATE) {
      fn = 'getGoshDeployTaskProposalParams'
      parser = this.parseTaskCreateEventParams
    } else if (type === EDaoEventType.TASK_UPGRADE) {
      fn = 'getUpgradeTaskProposalParams'
    } else if (type === EDaoEventType.DAO_TOKEN_VOTING_ADD) {
      fn = 'getGoshAddVoteTokenProposalParams'
      parser = this.parseAddVotingTokensEventParams
    } else if (type === EDaoEventType.DAO_TOKEN_REGULAR_ADD) {
      fn = 'getGoshAddRegularTokenProposalParams'
      parser = this.parseAddRegularTokensEventParams
    } else if (type === EDaoEventType.DAO_TOKEN_MINT) {
      fn = 'getGoshMintTokenProposalParams'
      parser = this.parseMintDaoTokensEventParams
    } else if (type === EDaoEventType.DAO_TAG_ADD) {
      fn = 'getGoshDaoTagProposalParams'
    } else if (type === EDaoEventType.DAO_TAG_REMOVE) {
      fn = 'getGoshDaoTagProposalParams'
    } else if (type === EDaoEventType.DAO_TOKEN_MINT_DISABLE) {
      fn = 'getNotAllowMintProposalParams'
    } else if (type === EDaoEventType.DAO_ALLOWANCE_CHANGE) {
      fn = 'getChangeAllowanceProposalParams'
      parser = this.parseMemberUpdateEventParams
    } else if (type === EDaoEventType.REPO_TAG_ADD) {
      fn = 'getGoshRepoTagProposalParams'
    } else if (type === EDaoEventType.REPO_TAG_REMOVE) {
      fn = 'getGoshRepoTagProposalParams'
    } else if (type === EDaoEventType.REPO_UPDATE_DESCRIPTION) {
      fn = 'getChangeDescriptionProposalParams'
    } else if (type === EDaoEventType.DAO_EVENT_HIDE_PROGRESS) {
      fn = 'getChangeHideVotingResultProposalParams'
    } else if (type === EDaoEventType.DAO_EVENT_ALLOW_DISCUSSION) {
      fn = 'getChangeAllowDiscussionProposalParams'
    } else if (type === EDaoEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE) {
      fn = 'getAbilityInviteProposalParams'
    } else if (type === EDaoEventType.MILESTONE_CREATE) {
      fn = 'getBigTaskDeployProposalParams'
      parser = this.parseMilestoneCreateEventParams
    } else if (type === EDaoEventType.MILESTONE_DELETE) {
      fn = 'getBigTaskProposalParams'
    } else if (type === EDaoEventType.MILESTONE_COMPLETE) {
      fn = 'getBigTaskProposalParams'
    } else if (type === EDaoEventType.MILESTONE_UPGRADE) {
      fn = 'getBigTaskUpgradeProposalParams'
    } else if (type === EDaoEventType.DAO_EXPERT_TAG_CREATE) {
      fn = 'getCreateDaoMembersTagParams'
    } else if (type === EDaoEventType.DAO_EXPERT_TAG_DELETE) {
      fn = 'getDestroyDaoMembersTagParams'
    } else if (type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_CREATE) {
      fn = 'getSetDaoMembersTagParams'
      parser = this.parseCreateDaoMemberExpertTagEventParams
    } else if (type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_DELETE) {
      fn = 'getDeleteDaoMembersTagParams'
      parser = this.parseDeleteDaoMemberExpertTagEventParams
    } else if (type === EDaoEventType.HACKATHON_CREATE) {
      fn = 'getDeployGrantParams'
      parser = this.parseCreateHackathonEventParams
    } else if (type === EDaoEventType.HACKATHON_UPDATE) {
      fn = 'getAddCurrenciesParams'
      parser = this.parseUpdateHackathonEventParams
    } else if (type === EDaoEventType.BRANCH_CREATE) {
      fn = 'getDeployBranchParams'
      parser = this.parseUpdateHackathonEventParams
    } else if (type === EDaoEventType.HACKATHON_APPS_APPROVE) {
      fn = 'getSetGrantPubkeysParams'
      parser = this.parseApproveackathonAppsEventParams
    } else if (type === EDaoEventType.MULTI_PROPOSAL) {
      const { num, data0 } = await this.runLocal('getDataFirst', {}, undefined, {
        useCachedBoc: true,
      })
      return {
        details: null,
        items: await this.parseMultiEventCell({
          count: parseInt(num),
          cell: data0,
          verbose,
        }),
      }
    } else {
      throw new GoshError(`Event type "${type}" is unknown`)
    }

    const decoded = await this.runLocal(fn, {}, undefined, { useCachedBoc: true })
    delete decoded.proposalKind

    if (verbose && parser) {
      return await parser(decoded)
    }

    return decoded
  }

  async parseMemberAddEventParams(data: any) {
    const members = await executeByChunk<any, any>(
      data.pubaddr,
      MAX_PARALLEL_READ,
      async (item) => {
        const { account } = await getDaoOrProfile(item.member)
        return {
          username: await account.getName(),
          profile: item.member,
          allowance: parseInt(item.count),
        }
      },
    )
    return { ...data, pubaddr: members }
  }

  async parseMemberDeleteEventParams(data: any) {
    const members = await executeByChunk<string, any>(
      data.pubaddr,
      MAX_PARALLEL_READ,
      async (address) => {
        const { account } = await getDaoOrProfile(address)
        return {
          username: await account.getName(),
          profile: address,
        }
      },
    )
    return { ...data, pubaddr: members }
  }

  async parseMemberUpdateEventParams(data: any) {
    const members = await executeByChunk<string, any>(
      data.pubaddr,
      MAX_PARALLEL_READ,
      async (address, index) => {
        const { account } = await getDaoOrProfile(address)
        return {
          username: await account.getName(),
          profile: address,
          increase: data.increase[index],
          grant: parseInt(data.grant[index]),
        }
      },
    )
    return { ...data, pubaddr: members }
  }

  async parseMintDaoTokensEventParams(data: any) {
    return { ...data, grant: parseInt(data.grant) }
  }

  async parseAddVotingTokensEventParams(data: any) {
    const { account } = await getDaoOrProfile(data.pubaddr)
    return {
      ...data,
      pubaddr: { username: await account.getName(), profile: account.address },
      grant: parseInt(data.grant),
    }
  }

  async parseAddRegularTokensEventParams(data: any) {
    const { account } = await getDaoOrProfile(data.pubaddr)
    return {
      ...data,
      pubaddr: { username: await account.getName(), profile: account.address },
      grant: parseInt(data.grant),
    }
  }

  async parseCreateDaoMemberExpertTagEventParams(data: any) {
    const accounts = await Promise.all(
      data.pubaddr.map(async (address: string) => {
        const { account } = await getDaoOrProfile(address)
        return { username: await account.getName(), profile: account.address }
      }),
    )

    return {
      ...data,
      pubaddr: accounts,
    }
  }

  async parseDeleteDaoMemberExpertTagEventParams(data: any) {
    const accounts = await Promise.all(
      data.pubaddr.map(async (address: string) => {
        const { account } = await getDaoOrProfile(address)
        return { username: await account.getName(), profile: account.address }
      }),
    )

    return {
      ...data,
      pubaddr: accounts,
    }
  }

  async parseTaskCreateEventParams(data: any) {
    const { tag, hashtag, ...rest } = data

    const grant: { [key: string]: TTaskGrantPair[] } = {}
    const grantTotal: { [key: string]: number } = {}
    let reward: number = 0

    for (const key of ['assign', 'review', 'manager']) {
      grant[key] = data.grant[key].map((item: any) => ({
        grant: parseInt(item.grant),
        lock: parseInt(item.lock),
      }))
      grantTotal[key] = _.sum(grant[key].map((item: any) => item.grant))
      reward += grantTotal[key]
    }

    const tags = tag || hashtag

    return {
      ...rest,
      grant,
      grantTotal,
      reward,
      tagsRaw: tags,
      tags: tags.filter((item: string) => item !== SYSTEM_TAG),
    }
  }

  async parseMilestoneCreateEventParams(data: any) {
    const { tag, hashtag, ...rest } = data

    const grant: { [key: string]: TTaskGrantPair[] } = {}
    const grantTotal: { [key: string]: number } = {}
    let budget: number = 0

    for (const key of ['assign', 'review', 'manager', 'subtask']) {
      grant[key] = data.grant[key].map((item: any) => ({
        grant: parseInt(item.grant),
        lock: parseInt(item.lock),
      }))
      grantTotal[key] = _.sum(grant[key].map((item: any) => item.grant))
      budget += grantTotal[key]
    }

    const manager = await AppConfig.goshroot.getUserProfile({
      address: Object.keys(data.commit.pubaddrmanager)[0],
    })
    const tags = tag || hashtag

    return {
      ...rest,
      grant,
      grantTotal,
      budget,
      manager: {
        username: await manager.getName(),
        usertype: EDaoMemberType.User,
      },
      tagsRaw: tags,
      tags: tags.filter((item: string) => item !== MILESTONE_TAG),
    }
  }

  async parseCreateHackathonEventParams(data: any) {
    const metadata = JSON.parse(data.reponame)
    return { ...data, metadata }
  }

  async parseUpdateHackathonEventParams(data: any) {
    const metadata = data.metadata ? JSON.parse(data.metadata) : null
    return { ...data, metadata }
  }

  async parseApproveackathonAppsEventParams(data: any) {
    const details = data.details.map((item: string) => JSON.parse(item))
    return { ...data, details }
  }

  private async parseMultiEventCell(params: {
    count: number
    cell: string
    verbose?: boolean
  }) {
    const { cell, count, verbose } = params

    const items = []
    let rest = cell
    for (let i = 0; i < count; i++) {
      const { data1: curr, data2: next } = await this.runLocal(
        'getHalfData',
        { Data: rest },
        undefined,
        { useCachedBoc: true },
      )
      items.push(await this.getMultiEventData({ data: curr, verbose }))

      if (i === count - 2) {
        items.push(await this.getMultiEventData({ data: next, verbose }))
        break
      }
      rest = next
      await sleep(100)
    }
    return items
  }

  private async getMultiEventData(params: { data: string; verbose?: boolean }) {
    const { verbose } = params

    let data = params.data
    const { proposalKind } = await this.runLocal(
      'getGoshProposalKindData',
      { Data: data },
      undefined,
      { useCachedBoc: true },
    )
    const type = parseInt(proposalKind)
    const label = DaoEventType[type]

    let fn = ''
    let parser: Function | undefined
    if (type === EDaoEventType.REPO_CREATE) {
      fn = 'getGoshDeployRepoProposalParamsData'
    } else if (type === EDaoEventType.BRANCH_LOCK) {
      fn = 'getGoshAddProtectedBranchProposalParamsData'
    } else if (type === EDaoEventType.BRANCH_UNLOCK) {
      fn = 'getGoshDeleteProtectedBranchProposalParamsData'
    } else if (type === EDaoEventType.DAO_MEMBER_ADD) {
      fn = 'getGoshDeployWalletDaoProposalParamsData'
      parser = this.parseMemberAddEventParams
    } else if (type === EDaoEventType.DAO_MEMBER_DELETE) {
      fn = 'getGoshDeleteWalletDaoProposalParamsData'
      parser = this.parseMemberDeleteEventParams
    } else if (type === EDaoEventType.DAO_UPGRADE) {
      fn = 'getGoshUpgradeDaoProposalParamsData'
    } else if (type === EDaoEventType.TASK_CREATE) {
      fn = 'getGoshDeployTaskProposalParamsData'
      parser = this.parseTaskCreateEventParams
    } else if (type === EDaoEventType.TASK_DELETE) {
      fn = 'getGoshDestroyTaskProposalParamsData'
    } else if (type === EDaoEventType.DAO_TOKEN_VOTING_ADD) {
      fn = 'getGoshAddVoteTokenProposalParamsData'
      parser = this.parseAddVotingTokensEventParams
    } else if (type === EDaoEventType.DAO_TOKEN_REGULAR_ADD) {
      fn = 'getGoshAddRegularTokenProposalParamsData'
      parser = this.parseAddRegularTokensEventParams
    } else if (type === EDaoEventType.DAO_TOKEN_MINT) {
      fn = 'getGoshMintTokenProposalParamsData'
      parser = this.parseMintDaoTokensEventParams
    } else if (type === EDaoEventType.DAO_TAG_ADD) {
      fn = 'getGoshDaoTagProposalParamsData'
    } else if (type === EDaoEventType.DAO_TAG_REMOVE) {
      fn = 'getGoshDaoTagProposalParamsData'
    } else if (type === EDaoEventType.DAO_TOKEN_MINT_DISABLE) {
      fn = 'getNotAllowMintProposalParamsData'
    } else if (type === EDaoEventType.DAO_ALLOWANCE_CHANGE) {
      fn = 'getChangeAllowanceProposalParamsData'
      parser = this.parseMemberUpdateEventParams
    } else if (type === EDaoEventType.REPO_TAG_ADD) {
      fn = 'getGoshRepoTagProposalParamsData'
    } else if (type === EDaoEventType.REPO_TAG_REMOVE) {
      fn = 'getGoshRepoTagProposalParamsData'
    } else if (type === EDaoEventType.REPO_UPDATE_DESCRIPTION) {
      fn = 'getChangeDescriptionProposalParamsData'
    } else if (type === EDaoEventType.DAO_EVENT_ALLOW_DISCUSSION) {
      fn = 'getChangeAllowDiscussionProposalParamsData'
    } else if (type === EDaoEventType.DAO_EVENT_HIDE_PROGRESS) {
      fn = 'getChangeHideVotingResultProposalParamsData'
    } else if (type === EDaoEventType.REPO_TAG_UPGRADE) {
      fn = 'getTagUpgradeProposalParamsData'
    } else if (type === EDaoEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE) {
      fn = 'getAbilityInviteProposalParamsData'
    } else if (type === EDaoEventType.TASK_REDEPLOY) {
      const decoded = await this.runLocal(
        'getRedeployTaskProposalParamsData',
        { Data: data },
        undefined,
        { useCachedBoc: true },
      )
      data = decoded.data
      fn = 'getTaskData'
      parser = this.parseTaskCreateEventParams
    } else if (type === EDaoEventType.TASK_UPGRADE) {
      fn = 'getUpgradeTaskProposalParamsData'
    } else if (type === EDaoEventType.TASK_REDEPLOYED) {
      return { type, label: DaoEventType[type], data: {} }
    } else if (type === EDaoEventType.MILESTONE_CREATE) {
      fn = 'getBigTaskDeployParamsData'
      parser = this.parseMilestoneCreateEventParams
    } else if (type === EDaoEventType.MILESTONE_DELETE) {
      fn = 'getBigTaskParamsData'
    } else if (type === EDaoEventType.MILESTONE_COMPLETE) {
      fn = 'getBigTaskParamsData'
    } else if (type === EDaoEventType.MILESTONE_UPGRADE) {
      fn = 'getBigTaskUpgradeProposalParamsData'
    } else if (type === EDaoEventType.PULL_REQUEST) {
      fn = 'getGoshSetCommitProposalParamsData'
    } else if (type === EDaoEventType.DAO_EXPERT_TAG_CREATE) {
      fn = 'getCreateDaoMembersTagParamsData'
    } else if (type === EDaoEventType.DAO_EXPERT_TAG_DELETE) {
      fn = 'getDestroyDaoMembersTagParamsData'
    } else if (type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_CREATE) {
      fn = 'getSetDaoMembersTagParamsData'
      parser = this.parseCreateDaoMemberExpertTagEventParams
    } else if (type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_DELETE) {
      fn = 'getDeleteDaoMembersTagParamsData'
      parser = this.parseDeleteDaoMemberExpertTagEventParams
    } else if (type === EDaoEventType.HACKATHON_CREATE) {
      fn = 'getDeployGrantParamsData'
      parser = this.parseCreateHackathonEventParams
    } else if (type === EDaoEventType.HACKATHON_UPDATE) {
      fn = 'getAddCurrenciesParamsData'
      parser = this.parseUpdateHackathonEventParams
    } else if (type === EDaoEventType.BRANCH_CREATE) {
      fn = 'getDeployBranchParamsData'
    } else if (type === EDaoEventType.HACKATHON_APPS_APPROVE) {
      fn = 'getSetGrantPubkeysParamsData'
      parser = this.parseApproveackathonAppsEventParams
    } else if (type === EDaoEventType.DELAY) {
      return { type, label: DaoEventType[type], data: {} }
    } else {
      throw new GoshError(`Multi event type "${type}" is unknown`)
    }

    const decoded = await this.runLocal(fn, { Data: data }, undefined, {
      useCachedBoc: true,
    })
    delete decoded.proposalKind

    const subdata = verbose && parser ? await parser(decoded) : decoded
    return { type, label, data: subdata }
  }
}
