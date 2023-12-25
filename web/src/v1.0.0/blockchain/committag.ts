import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import CommitTagABI from './abi/committag.abi.json'
import { TGoshCommitTag } from '../types/repository.types'
import { sha1 } from 'react-gosh'
import { GoshCommit } from './commit'
import { GoshRepository } from './repository'

export class GoshCommitTag extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, CommitTagABI, address)
  }

  async getDetails(): Promise<TGoshCommitTag> {
    const { value0: content } = await this.runLocal('getContent', {}, undefined, {
      useCachedBoc: true,
    })

    const { value0 } = await this.runLocal('getCommit', {}, undefined, {
      useCachedBoc: true,
    })
    const commit = new GoshCommit(this.client, value0)
    const commitData = await commit.getDetails()
    const repository = new GoshRepository(this.client, commitData.repository)

    return {
      reponame: await repository.getName(),
      name: sha1(content, 'tag', 'sha1'),
      content,
      commit: {
        address: commit.address,
        name: commitData.name,
      },
    }
  }
}
