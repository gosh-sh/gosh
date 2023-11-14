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
        const details0 = await this.runLocal('getOwner', {}, undefined, {
            useCachedBoc: true,
        })
        return {
            task: _task,
            tag: details0.value0,
            dao_address: details0.value1,
            repo_address: details0.value2,
        }
    }
}
