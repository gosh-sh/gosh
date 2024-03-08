import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { GoshError } from '../../errors'
import { EDaoMemberType, TDaoDetailsMemberItem } from '../types/dao.types'
import DaoABI from './abi/dao.abi.json'
import { DaoEvent } from './daoevent'
import { DaoWallet } from './daowallet'
import { getDaoOrProfile } from './helpers'
import { UserProfile } from './userprofile'

export class Dao extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, DaoABI, address)
  }

  async isMember(profile: string): Promise<boolean> {
    const { value0 } = await this.runLocal('isMember', { pubaddr: profile })
    return value0
  }

  async isMintOn(): Promise<boolean> {
    const { _allowMint } = await this.runLocal('_allowMint', {})
    return _allowMint
  }

  async getName(): Promise<string> {
    const { value0 } = await this.runLocal('getNameDao', {}, undefined, {
      useCachedBoc: true,
    })
    return value0
  }

  async getDetails() {
    const details = await this.runLocal('getDetails', {})
    const { _isTaskRedeployed } = await this.runLocal('_isTaskRedeployed', {})

    // Fix contracts bug with `isUpgraded` flag
    const prev_addr = await this.getPrevious()
    if (prev_addr) {
      const prev_dao = new Dao(this.client, prev_addr)
      const prev_ver = await prev_dao.getVersion()
      if (prev_ver === '1.0.0') {
        details.isUpgraded = true
      }
    }

    return { ...details, isTaskUpgraded: _isTaskRedeployed }
  }

  async getOwner(): Promise<string> {
    const { value0 } = await this.runLocal('getOwner', {}, undefined, {
      useCachedBoc: true,
    })
    return value0
  }

  async getMembers(options: {
    parse?: {
      wallets: { [pubaddr: string]: any }
      daomembers: { [address: string]: string }
      expert_tags: {
        dao: { [hash: string]: { name: string; value: string } }
        members: { [phash: string]: { [thash: string]: boolean } }
      }
    }
    isDaoMemberOf?: boolean
  }): Promise<TDaoDetailsMemberItem[]> {
    const { parse, isDaoMemberOf } = options

    const toparse = parse || {
      wallets: {},
      daomembers: {},
      expert_tags: { dao: {}, members: {} },
    }
    if (!parse) {
      const details = await this.runLocal('getDetails', {}, undefined, {
        retries: 1,
      })
      toparse.wallets = details.wallets
      toparse.daomembers = details.daoMembers
      toparse.expert_tags = {
        dao: details.daoTagData,
        members: details.daoMembersTag,
      }
    }

    // Update daomembers key
    for (const key of Object.keys(toparse.daomembers)) {
      const addr = `0:${key.slice(2)}`
      toparse.daomembers[addr] = toparse.daomembers[key]
      delete toparse.daomembers[key]
    }

    const daoaddr = Object.keys(toparse.daomembers).map((key) => key)
    const members = await Promise.all(
      Object.keys(toparse.wallets).map(async (key) => {
        const testaddr = `0:${key.slice(2)}`

        const resolved: { type: EDaoMemberType; account: UserProfile | Dao } = {
          type: EDaoMemberType.User,
          account: new UserProfile(this.client, testaddr),
        }
        if (isDaoMemberOf) {
          const { type, account } = await getDaoOrProfile(testaddr)
          resolved.type = type
          resolved.account = account
        } else {
          resolved.type =
            daoaddr.indexOf(testaddr) >= 0 ? EDaoMemberType.Dao : EDaoMemberType.User
          resolved.account =
            resolved.type === EDaoMemberType.Dao
              ? new Dao(this.client, testaddr)
              : new UserProfile(this.client, testaddr)
        }

        // Parse DAO member expert tags
        const expert_tags = []
        const entries = Object.entries(toparse.expert_tags.members[key] || {})
        for (const [key_hash, enabled] of entries) {
          const dao_expert_tag = toparse.expert_tags.dao[key_hash]
          if (dao_expert_tag && enabled) {
            expert_tags.push({
              name: dao_expert_tag.name,
              multiplier: parseInt(dao_expert_tag.value),
            })
          }
        }

        return {
          usertype: resolved.type,
          profile: resolved.account,
          wallet: new DaoWallet(this.client, toparse.wallets[key].member),
          allowance: parseInt(toparse.wallets[key].count),
          daomembers: toparse.daomembers,
          expert_tags,
        }
      }),
    )

    return members
  }

  async getMemberWallet(params: {
    address?: string
    keys?: KeyPair
    data?: {
      profile: string
      index?: number
    }
  }) {
    const { address, data, keys } = params

    if (!address && !data) {
      throw new GoshError('Value error', 'Data or address not passed')
    }

    let _address = address
    if (!_address) {
      const { profile, index = 0 } = data!
      const { value0 } = await this.runLocal(
        'getAddrWallet',
        { pubaddr: profile, index },
        undefined,
        { useCachedBoc: true },
      )
      _address = value0
    }

    return new DaoWallet(this.client, _address!, keys)
  }

  async getEventCodeHash(): Promise<string> {
    const { value0 } = await this.runLocal('getProposalCode', {}, undefined, {
      useCachedBoc: true,
    })
    const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
    return hash
  }

  async getEvent(params: { address: string }): Promise<DaoEvent> {
    const { address } = params
    return new DaoEvent(this.client, address)
  }

  async getTaskCodeHash(reponame: string): Promise<string> {
    const { value0 } = await this.runLocal(
      'getTaskCode',
      { repoName: reponame },
      undefined,
      { useCachedBoc: true },
    )
    const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
    return hash
  }

  async getMilestoneCodeHash(reponame: string): Promise<string> {
    const { value0 } = await this.runLocal(
      'getBigTaskCode',
      { repoName: reponame },
      undefined,
      { useCachedBoc: true },
    )
    const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
    return hash
  }

  async getPrevious() {
    const { value0 } = await this.runLocal('getPreviousDaoAddr', {}, undefined, {
      useCachedBoc: true,
    })
    return (value0 as string) || null
  }

  async createLimitedWallet(profile: string) {
    await this.run('deployWalletsOutMember', {
      pubmem: [{ member: profile, count: 0, expired: 0 }],
      index: 0,
    })
  }
}
