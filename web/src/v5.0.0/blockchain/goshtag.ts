import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import GoshTagABI from './abi/goshtag.abi.json'

export class GoshTag extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, GoshTagABI, address)
    }

    async getDetails() {
        const { _task } = await this.runLocal('_task', {}, undefined, {
            useCachedBoc: true,
        })
        return {
            task: _task,
        }
    }
}
