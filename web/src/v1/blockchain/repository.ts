import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import RepositoryABI from './abi/repository.abi.json'

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
}
