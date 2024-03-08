import { TonClient } from '@eversdk/core'
import { AppConfig } from '../../appconfig'
import { BaseContract } from '../../blockchain/contract'
import { DaoProfile } from '../../blockchain/daoprofile'
import { VersionController } from '../../blockchain/versioncontroller'
import { EGoshError, GoshError } from '../../errors'
import { whileFinite } from '../../utils'
import GoshABI from './abi/systemcontract.abi.json'
import { GoshCommitTag } from './committag'
import { Dao } from './dao'
import { GoshTag } from './goshtag'
import { GoshRepository } from './repository'
import { Task } from './task'
import { UserProfile } from './userprofile'

export class SystemContract extends BaseContract {
  versionController: VersionController

  constructor(client: TonClient, address: string) {
    super(client, GoshABI, address)
    this.versionController = AppConfig.goshroot
  }

  async getGoshTag(params: { address: string }) {
    const { address } = params
    return new GoshTag(this.client, address)
  }

  async getCommitTag(params: {
    address?: string
    data?: { daoname: string; reponame: string; tagname: string }
  }) {
    const { address, data } = params

    if (!address && !data) {
      throw new GoshError('Value error', 'Data or address not passed')
    }

    if (address) {
      return new GoshCommitTag(this.client, address)
    }

    // Get commit tag by data
    const { daoname, reponame, tagname } = data!
    const { value0 } = await this.runLocal('getTagAddress', {
      daoName: daoname,
      repoName: reponame,
      tagName: tagname,
    })
    return new GoshCommitTag(this.client, value0)
  }

  async getUserProfile(params: { username?: string; address?: string }) {
    const { username, address } = params
    if (address) {
      return new UserProfile(this.client, address)
    }

    if (!username) {
      throw new GoshError(EGoshError.USER_NAME_UNDEFINED)
    }
    const { value0 } = await this.runLocal(
      'getProfileAddr',
      { name: username },
      undefined,
      { useCachedBoc: true },
    )
    return new UserProfile(this.client, value0)
  }

  async getDaoProfile(name: string) {
    const { value0 } = await this.runLocal('getProfileDaoAddr', { name }, undefined, {
      useCachedBoc: true,
    })
    return new DaoProfile(this.account.client, value0)
  }

  async getDao(params: { name?: string; address?: string }) {
    const { name, address } = params

    if (!name && !address) {
      throw new GoshError('DAO name or address required')
    }

    if (address) {
      return new Dao(this.client, address)
    }

    const { value0 } = await this.runLocal('getAddrDao', { name }, undefined, {
      useCachedBoc: true,
    })
    return new Dao(this.client, value0)
  }

  async getRepository(options: { path?: string; address?: string }) {
    const { path, address } = options
    if (address) {
      return new GoshRepository(this.client, address)
    }

    if (!path) {
      throw new GoshError('Repository path is undefined')
    }
    const [dao, name] = path.split('/')
    const { value0 } = await this.runLocal(
      'getAddrRepository',
      { dao, name },
      undefined,
      { useCachedBoc: true },
    )
    return new GoshRepository(this.client, value0)
  }

  async getRepositoryCodeHash(daoaddr: string): Promise<string> {
    const { value0 } = await this.runLocal(
      'getRepoDaoCode',
      { dao: daoaddr },
      undefined,
      { useCachedBoc: true },
    )
    const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
    return hash
  }

  async getDaoTaskTagCodeHash(daoaddr: string, tag: string): Promise<string> {
    const { value0 } = await this.runLocal(
      'getTaskTagDaoCode',
      { dao: daoaddr, tag },
      undefined,
      { useCachedBoc: true },
    )
    const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
    return hash
  }

  async getTask(options: {
    address?: string
    data?: {
      daoname: string
      reponame: string
      taskname: string
    }
  }) {
    const { address, data } = options

    if (!address && !data) {
      throw new GoshError('Value error', 'Data or address not passed')
    }

    let _address = address
    if (!_address) {
      const { daoname, reponame, taskname } = data!
      const { value0 } = await this.runLocal('getTaskAddr', {
        dao: daoname,
        repoName: reponame,
        nametask: taskname,
      })
      _address = value0
    }

    return new Task(this.client, _address!)
  }

  async createUserProfile(username: string, pubkey: string) {
    // Get profile and check it's status
    const profile = await this.getUserProfile({ username })
    if (await profile.isDeployed()) {
      return profile
    }

    // Deploy profile
    await this.run('deployProfile', { name: username, pubkey })
    const wait = await whileFinite(async () => await profile.isDeployed())
    if (!wait) {
      throw new GoshError('Deploy profile timeout reached')
    }
    return profile
  }
}
