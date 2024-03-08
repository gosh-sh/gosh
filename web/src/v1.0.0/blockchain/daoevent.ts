import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { DaoEventType, MAX_PARALLEL_READ } from '../../constants'
import { GoshError } from '../../errors'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk } from '../../utils'
import SmvEventABI from './abi/smvproposal.abi.json'
import { DaoWallet } from './daowallet'
import { getSystemContract } from './helpers'

export class DaoEvent extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, SmvEventABI, address)
  }

  async getDetails(params: { wallet?: DaoWallet | null }) {
    const { wallet } = params

    const { proposalKind } = await this.runLocal('getGoshProposalKind', {}, undefined, {
      useCachedBoc: true,
    })
    const type = parseInt(proposalKind)
    const { platform_id } = await this.runLocal('platform_id', {}, undefined, {
      useCachedBoc: true,
    })

    const { startTime } = await this.runLocal('startTime', {}, undefined, {
      useCachedBoc: true,
    })
    const { finishTime } = await this.runLocal('finishTime', {}, undefined, {
      useCachedBoc: true,
    })
    const { realFinishTime } = await this.runLocal('realFinishTime', {})
    const time = {
      start: parseInt(startTime) * 1000,
      finish: parseInt(finishTime) * 1000,
      completed: parseInt(realFinishTime) * 1000,
    }

    const { value0: isCompleted } = await this.runLocal('_isCompleted', {})
    const status = {
      completed: isCompleted !== null || (time.finish > 0 && Date.now() > time.finish),
      accepted: !!isCompleted,
    }

    const { votesYes } = await this.runLocal('votesYes', {})
    const { votesNo } = await this.runLocal('votesNo', {})
    const { totalSupply } = await this.runLocal('totalSupply', {}, undefined, {
      useCachedBoc: true,
    })
    const votesYours = wallet ? await wallet.smvEventVotes(platform_id) : 0
    const votes = {
      yes: parseInt(votesYes),
      no: parseInt(votesNo),
      yours: votesYours,
      total: parseInt(totalSupply),
    }

    return {
      platformId: platform_id,
      type,
      label: DaoEventType[type],
      time,
      status,
      votes,
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
      parser = this.parseDaoMemberAddEventParams
    } else if (type === EDaoEventType.DAO_MEMBER_DELETE) {
      fn = 'getGoshDeleteWalletDaoProposalParams'
      parser = this.parseDaoMemberDeleteEventParams
    } else if (type === EDaoEventType.BRANCH_LOCK) {
      fn = 'getGoshAddProtectedBranchProposalParams'
    } else if (type === EDaoEventType.BRANCH_UNLOCK) {
      fn = 'getGoshDeleteProtectedBranchProposalParams'
    } else if (type === EDaoEventType.PULL_REQUEST) {
      fn = 'getGoshSetCommitProposalParams'
    } else if (type === EDaoEventType.DAO_CONFIG_CHANGE) {
      fn = 'getGoshSetConfigDaoProposalParams'
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

  async parseDaoMemberAddEventParams(data: any) {
    const sc = getSystemContract()
    return await executeByChunk<string, any>(
      data.pubaddr,
      MAX_PARALLEL_READ,
      async (address) => {
        const profile = await sc.getUserProfile({ address })
        return {
          username: await profile.getName(),
          profile: address,
          allowance: 20,
        }
      },
    )
  }

  async parseDaoMemberDeleteEventParams(data: any) {
    const sc = getSystemContract()
    return await executeByChunk<string, any>(
      data.pubaddr,
      MAX_PARALLEL_READ,
      async (address) => {
        const profile = await sc.getUserProfile({ address })
        return {
          username: await profile.getName(),
          profile: address,
        }
      },
    )
  }
}
