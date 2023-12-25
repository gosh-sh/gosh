import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { UserProfile } from '../../blockchain/userprofile'
import { TDaoDetailsMemberItem } from '../types/dao.types'
import DaoABI from './abi/dao.abi.json'
import { DaoEvent } from './daoevent'
import { DaoWallet } from './daowallet'

export class Dao extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, DaoABI, address)
  }

  async isMember(profile: string): Promise<boolean> {
    const { value0 } = await this.runLocal('isMember', { pubaddr: profile })
    return value0
  }

  async getName(): Promise<string> {
    const { value0 } = await this.runLocal('getNameDao', {}, undefined, {
      useCachedBoc: true,
    })
    return value0
  }

  async getOwner(): Promise<string> {
    const { value0 } = await this.runLocal('getOwner', {}, undefined, {
      useCachedBoc: true,
    })
    return value0
  }

  async getMembers(): Promise<TDaoDetailsMemberItem[]> {
    const { value0 } = await this.runLocal('getWalletsFull', {}, undefined, {
      retries: 1,
    })
    const members = Object.keys(value0).map((key) => ({
      profile: new UserProfile(this.client, `0:${key.slice(2)}`),
      wallet: new DaoWallet(this.client, value0[key].member),
      allowance: parseInt(value0[key].count),
    }))
    return members
  }

  async getMemberWallet(params: { profile: string; index?: number; keys?: KeyPair }) {
    const { profile, index = 0, keys } = params
    const { value0 } = await this.runLocal(
      'getAddrWallet',
      {
        pubaddr: profile,
        index,
      },
      undefined,
      { useCachedBoc: true },
    )
    return new DaoWallet(this.client, value0, keys)
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
}
