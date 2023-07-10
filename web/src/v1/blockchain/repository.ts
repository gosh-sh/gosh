import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import RepositoryABI from './abi/repository.abi.json'
import { TBranch } from '../types/repository.types'
import { CommitTag } from './committag'

export class Repository extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, RepositoryABI, address)
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getName', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    async getBranches(): Promise<TBranch[]> {
        const { value0 } = await this.runLocal('getAllAddress', {})
        return value0.map((item: any) => ({
            name: item.branchname,
            commit: {
                address: item.commitaddr,
                version: item.commitversion,
            },
        }))
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
        return new CommitTag(this.client, address)
    }
}
