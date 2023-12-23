import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import RepositoryABI from './abi/repository.abi.json'
import { TGoshBranch } from '../types/repository.types'
import { GoshCommitTag } from './committag'
import { GoshError } from '../../errors'
import { GoshCommit } from './commit'
import { GoshShapshot } from './snapshot'

export class GoshRepository extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, RepositoryABI, address)
  }

  async getName(): Promise<string> {
    const { value0 } = await this.runLocal('getName', {}, undefined, {
      useCachedBoc: true,
    })
    return value0
  }

  async getDetails() {
    const data = await this.runLocal('getDetails', {})
    return {
      name: data.name,
      branches: await this.getBranches(data.alladress),
      description: data.description,
      head: data.head,
      tags: Object.values(data.hashtag),
      isReady: data.ready,
    }
  }

  async getBranches(parse?: any): Promise<TGoshBranch[]> {
    if (!parse) {
      const { value0 } = await this.runLocal('getAllAddress', {})
      parse = value0
    }

    return parse.map((item: any) => ({
      name: item.branchname,
      commit: {
        address: item.commitaddr,
        version: item.commitversion,
      },
    }))
  }

  async getBranch(name: string): Promise<TGoshBranch> {
    const { value0 } = await this.runLocal('getAddrBranch', { name })
    return {
      name: value0.branchname,
      commit: {
        address: value0.commitaddr,
        version: value0.commitversion,
      },
    }
  }

  async getCommitTagCodeHash() {
    const code = await this.runLocal('getTagCode', {}, undefined, {
      useCachedBoc: true,
    })
    const { hash } = await this.client.boc.get_boc_hash({ boc: code.value0 })
    return hash
  }

  async getCommitTag(params: { address: string }) {
    const { address } = params
    return new GoshCommitTag(this.client, address)
  }

  async getCommit(params: { name?: string; address?: string }) {
    const { name, address } = params

    let _address = address
    if (!_address) {
      if (!name) {
        throw new GoshError('Value error', 'Commit name undefined')
      }

      const { value0 } = await this.runLocal(
        'getCommitAddr',
        { nameCommit: name },
        undefined,
        { useCachedBoc: true },
      )
      _address = value0
    }

    return new GoshCommit(this.client, _address!)
  }

  async getSnapshot(params: {
    address?: string
    data?: { commitname: string; filename: string; branch?: string }
  }) {
    const { address, data } = params

    if (!address && !data) {
      throw new GoshError('Value error', 'Data or address not passed')
    }

    let _address = address
    if (!_address) {
      const { commitname, filename } = data!
      const { value0 } = await this.runLocal(
        'getSnapshotAddr',
        { commitsha: commitname, name: filename },
        undefined,
        { useCachedBoc: true },
      )
      _address = value0
    }

    return new GoshShapshot(this.client, _address!)
  }
}
