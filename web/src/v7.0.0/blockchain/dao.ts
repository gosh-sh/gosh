import type { KeyPair, TonClient } from '@eversdk/core'
import { AppConfig } from '../../appconfig'
import { BaseContract } from '../../blockchain/contract'
import { UserProfile } from '../../blockchain/userprofile'
import { GoshError } from '../../errors'
import { EDaoMemberType, type TDaoDetailsMemberItem } from '../types/dao.types'
import DaoABI from './abi/dao.abi.json'
import { DaoEvent } from './daoevent'
import { DaoWallet } from './daowallet'
import { getSystemContract } from './helpers'

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
    details.isReady = details.isUpgraded
    details.isUpgraded = details.isRepoUpgraded && _isTaskRedeployed
    const prev_addr = await this.getPrevious()
    if (prev_addr) {
      const prev_dao = new Dao(this.client, prev_addr)
      const prev_ver = await prev_dao.getVersion()
      if (prev_ver === '1.0.0') {
        details.isReady = true
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
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
    const sc = getSystemContract()

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

    // Force insert wallet in another DAO for current DAO,
    // when isDaoMemberOf=true and wallet of some version in another DAO exists
    if (isDaoMemberOf) {
      for (const key of [...Object.keys(toparse.wallets)]) {
        let extDao = await sc.getDao({ address: `0:${key.slice(2)}` })
        extDao = await sc.getDao({ name: await extDao.getName() })
        const extDaoKey = `0x${extDao.address.slice(2)}`
        if ((await extDao.isDeployed()) && !toparse.wallets[extDaoKey]) {
          const extWallet = await extDao.getMemberWallet({
            data: { profile: this.address },
          })
          if (await extWallet.isDeployed()) {
            toparse.wallets[extDaoKey] = extWallet.address
          }
        }
      }
    }

    const daoaddr = Object.keys(toparse.daomembers).map((key) => key)
    const members = await Promise.all(
      Object.keys(toparse.wallets).map(async (key) => {
        const testaddr = `0:${key.slice(2)}`

        const resolved: {
          type: EDaoMemberType
          account: UserProfile | Dao
          name: string
        } = {
          type: EDaoMemberType.User,
          account: new UserProfile(this.client, testaddr),
          name: '',
        }
        if (isDaoMemberOf) {
          resolved.type = EDaoMemberType.Dao
          const ver = await new Dao(this.client, testaddr).getVersion()
          const sc = AppConfig.goshroot.getSystemContract(ver)
          resolved.account = (await sc.getDao({
            address: resolved.account.address,
          })) as Dao
          resolved.name = await resolved.account.getName()
        } else {
          resolved.type =
            daoaddr.indexOf(testaddr) >= 0
              ? EDaoMemberType.Dao
              : EDaoMemberType.User
          if (resolved.type === EDaoMemberType.Dao) {
            resolved.account = new Dao(this.client, testaddr)
            resolved.name = toparse.daomembers[resolved.account.address]
          } else if (resolved.type === EDaoMemberType.User) {
            resolved.account = new UserProfile(this.client, testaddr)
            resolved.name = await resolved.account.getName()
          }
        }

        // Parse DAO member expert tags
        const expert_tags = []
        const entries = Object.entries(toparse.expert_tags.members[key] || {})
        for (const [key_hash, enabled] of entries) {
          const dao_expert_tag = toparse.expert_tags.dao[key_hash]
          if (dao_expert_tag && enabled) {
            expert_tags.push({
              name: dao_expert_tag.name,
              multiplier: Number.parseInt(dao_expert_tag.value),
            })
          }
        }

        // Get wallet depending on parsing type
        let wallet: DaoWallet
        if (isDaoMemberOf) {
          wallet = await (resolved.account as Dao).getMemberWallet({
            address: toparse.wallets[key],
          })
        } else {
          wallet = new DaoWallet(this.client, toparse.wallets[key].member)
        }

        return {
          name: resolved.name,
          usertype: resolved.type,
          profile: resolved.account,
          wallet,
          allowance: Number.parseInt(toparse.wallets[key].count),
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
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const { profile, index = 0 } = data!
      const { value0 } = await this.runLocal(
        'getAddrWallet',
        { pubaddr: profile, index },
        undefined,
        { useCachedBoc: true },
      )
      _address = value0
    }

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
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
    const { value0 } = await this.runLocal(
      'getPreviousDaoAddr',
      {},
      undefined,
      {
        useCachedBoc: true,
      },
    )
    return (value0 as string) || null
  }

  async createLimitedWallet(profile: string) {
    await this.run('deployWalletsOutMember', {
      pubmem: [{ member: profile, count: 0, expired: 0 }],
      index: 0,
    })
  }

  async getNext() {
    const name = await this.getName()
    const curVersion = await this.getVersion()
    const nextVersions = Object.keys(AppConfig.getVersions()).filter(
      (k) => k > curVersion,
    )
    for (const version of nextVersions) {
      const sc = AppConfig.goshroot.getSystemContract(version)
      const account = await sc.getDao({ name })
      if (await account.isDeployed()) {
        return { account, version }
      }
    }
    return null
  }
}
