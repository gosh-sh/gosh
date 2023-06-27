import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import DaoABI from './abi/goshdao.abi.json'

export class Dao extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, DaoABI, address)
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getNameDao', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    async getShortDescription(): Promise<string | null> {
        return ''
    }

    async getTags(): Promise<string[] | null> {
        return []
    }
}
