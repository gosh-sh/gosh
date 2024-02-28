import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import CommitABI from './abi/commit.abi.json'
import { TGoshCommit } from '../types/repository.types'

export class GoshCommit extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, CommitABI, address)
  }

  async getDetails(): Promise<TGoshCommit> {
    const details = await this.runLocal('getCommit', {}, undefined, {
      useCachedBoc: true,
    })
    const { value0: treeaddr } = await this.runLocal('gettree', {}, undefined, {
      useCachedBoc: true,
    })
    return {
      repository: details.repo,
      branch: details.branch,
      name: details.sha,
      parents: details.parents,
      content: details.content,
      initupgrade: details.initupgrade,
      treeaddr,
    }
  }
}
