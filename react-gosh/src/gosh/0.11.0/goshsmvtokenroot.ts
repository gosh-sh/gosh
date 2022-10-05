import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshSmvTokenRoot } from '../interfaces'

class GoshSmvTokenRoot extends BaseContract implements IGoshSmvTokenRoot {
    static key: string = 'tokenroot'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshSmvTokenRoot.key, address, {
            version: GoshSmvTokenRoot.version,
        })
    }

    async getTotalSupply(): Promise<number> {
        const result = await this.account.runLocal('totalSupply_', {})
        return +result.decoded?.output.totalSupply_
    }
}

export { GoshSmvTokenRoot }
