import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import GoshABI from './abi/systemcontract.abi.json'
import { GoshError } from '../../errors'
import { Dao } from './dao'
import { GoshRepository } from './repository'
import { AppConfig } from '../../appconfig'
import { VersionController } from '../../blockchain/versioncontroller'
import { executeByChunk, whileFinite } from '../../utils'
import { GoshTag } from './goshtag'
import { Task } from './task'
import { contextVersion } from '../constants'
import { getAllAccounts } from '../../blockchain/utils'
import { MAX_PARALLEL_READ } from '../../constants'
import { GoshCommitTag } from './committag'
import { DaoProfile } from '../../blockchain/daoprofile'

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
    data?: { repoaddr: string; tagname: string }
  }) {
    const { address, data } = params

    if (!address && !data) {
      throw new GoshError('Value error', 'Data or address not passed')
    }

    if (address) {
      return new GoshCommitTag(this.client, address)
    }

    // Get commit tag by data
    const code = await AppConfig.goshroot.getCommitTagCode({
      tagcode:
        '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',
      repoaddr: data!.repoaddr,
      version: contextVersion,
    })
    const { hash } = await this.client.boc.get_boc_hash({ boc: code })
    const accounts = await getAllAccounts({
      filters: [`code_hash: {eq:"${hash}"}`],
    })

    const details = await executeByChunk(accounts, MAX_PARALLEL_READ, async ({ id }) => {
      const account = new GoshCommitTag(this.client, id)
      const details = await account.getDetails()
      return { account, ...details }
    })

    const found = details.find(({ name }) => name === data!.tagname)
    return found?.account || null
  }

  async getDaoProfile(name: string) {
    const { value0 } = await this.runLocal('getProfileDaoAddr', { name }, undefined, {
      useCachedBoc: true,
    })
    return new DaoProfile(this.account.client, value0)
  }

  async getDao(params: { name?: string; address?: string }) {
    const { name, address } = params

    if (address) {
      return new Dao(this.client, address)
    }

    if (name) {
      const { value0 } = await this.runLocal('getAddrDao', { name }, undefined, {
        useCachedBoc: true,
      })
      return new Dao(this.client, value0)
    }

    throw new GoshError('DAO name or address required')
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
    const profile = await this.versionController.getUserProfile({ username })
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
