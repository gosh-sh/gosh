import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import RepositoryABI from './abi/repository.abi.json'
import { TRepositoryBranch } from '../types/repository.types'

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

    async getBranches(): Promise<TRepositoryBranch[]> {
        const { value0 } = await this.runLocal('getAllAddress', {})
        return value0.map((item: any) => ({
            name: item.branchname,
            commit: {
                address: item.commitaddr,
                version: item.commitversion,
            },
        }))
    }
}
