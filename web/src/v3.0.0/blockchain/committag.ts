import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import CommitTagABI from './abi/committag.abi.json'
import { TGoshCommitTag } from '../types/repository.types'

export class GoshCommitTag extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, CommitTagABI, address)
    }

    async getDetails(): Promise<TGoshCommitTag> {
        const { value0, value1, value2, value3, value4 } = await this.runLocal(
            'getDetails',
            {},
            undefined,
            { useCachedBoc: true },
        )
        return {
            reponame: value4,
            name: value0,
            content: value3,
            commit: {
                address: value1,
                name: value2,
            },
        }
    }
}
