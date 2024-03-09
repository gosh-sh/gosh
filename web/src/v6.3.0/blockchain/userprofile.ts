import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { DaoProfile } from '../../blockchain/daoprofile'
import { EGoshError, GoshError } from '../../errors'
import { TSystemContract } from '../../types/blockchain.types'
import { whileFinite } from '../../utils'
import UserProfileABI from './abi/profile.abi.json'
import { Dao } from './dao'

export class UserProfile extends BaseContract {
  static key: string = 'profile'

  constructor(client: TonClient, address: string, keys?: KeyPair) {
    super(client, UserProfileABI, address, { keys })
  }

  async isOwnerPubkey(pubkey: string): Promise<boolean> {
    if (!pubkey.startsWith('0x')) {
      pubkey = `0x${pubkey}`
    }
    const result = await this.runLocal('isPubkeyCorrect', { pubkey })
    return result.value0
  }

  async getName(): Promise<string> {
    const { value0 } = await this.runLocal('getName', {}, undefined, {
      useCachedBoc: true,
    })
    return value0
  }

  async getDaoProfile(name: string) {
    const { value0 } = await this.runLocal('getProfileDaoAddr', { name }, undefined, {
      useCachedBoc: true,
    })
    return new DaoProfile(this.account.client, value0)
  }

  async getPubkeys(): Promise<string[]> {
    const { value0 } = await this.runLocal('getAccess', {})
    return Object.keys(value0)
  }

  async createDao(
    systemcontract: TSystemContract,
    name: string,
    memberAddr: string[],
    prevAddr?: string | null,
  ) {
    if (!prevAddr) {
      const profileDao = await this.getDaoProfile(name)
      if (await profileDao.isDeployed()) {
        throw new GoshError(EGoshError.DAO_EXISTS)
      }
    }

    let isCompletelyDeployed = false
    await this.account.subscribeMessages('body msg_type', async ({ body, msg_type }) => {
      const decoded = await this.decodeMessageBody(body, +msg_type)
      if (decoded?.name === 'deployedWallet') {
        await this.account.free()
        isCompletelyDeployed = true
      }
    })

    const dao = (await systemcontract.getDao({ name })) as Dao
    await this.run('deployDao', {
      systemcontract: systemcontract.address,
      name,
      pubmem: memberAddr,
      previous: prevAddr || null,
    })

    if (!(await whileFinite(async () => await dao.isDeployed()))) {
      await this.account.free()
      throw new GoshError('Deploy DAO timeout reached')
    }

    if (!(await whileFinite(() => isCompletelyDeployed, 1000))) {
      await this.account.free()
      throw new GoshError('Deploy DAO timeout reached')
    }

    return dao
  }

  // async setGoshAddress(address: TAddress): Promise<void> {
  //     await this.run('setNewSystemContract', { systemcontract: address })
  // }

  async turnOn(params: {
    dao_name: string
    dao_version: string
    pubkey: string
  }): Promise<void> {
    const { dao_name, dao_version, ...rest } = params
    const pubkey = !rest.pubkey.startsWith('0x') ? `0x${rest.pubkey}` : rest.pubkey
    await this.run('turnOn', { namedao: dao_name, versionwallet: dao_version, pubkey })
  }

  async sendRepoTokens(params: {
    dao_name: string
    repo_name: string
    recipient_profile_addr: string
    value: bigint
  }) {
    const { dao_name, repo_name, recipient_profile_addr, value } = params
    await this.run('transferFromRepoWallet', {
      namedao: dao_name,
      namerepo: repo_name,
      pubaddr: recipient_profile_addr,
      value: value.toString(),
    })
  }
}
