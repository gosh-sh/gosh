import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import CommitABI from './abi/commit.abi.json'
import { TCommit } from '../types/repository.types'

export class Commit extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, CommitABI, address)
    }

    async getDetails(): Promise<TCommit> {
        const details = await this.runLocal('getCommit', {}, undefined, {
            useCachedBoc: true,
        })
        return {
            repository: details.repo,
            branch: details.branch,
            name: details.sha,
            parents: details.parents,
            content: details.content,
            initupgrade: details.initupgrade,
        }
    }
}
