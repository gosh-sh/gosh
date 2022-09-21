import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { IGoshSmvTokenRoot } from './interfaces'

class GoshSmvTokenRoot extends BaseContract implements IGoshSmvTokenRoot {
    static key: string = 'tokenroot'

    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshSmvTokenRoot.key, address, { version })
    }

    async getTotalSupply(): Promise<number> {
        const result = await this.account.runLocal('totalSupply_', {})
        return +result.decoded?.output.totalSupply_
    }
}

export { GoshSmvTokenRoot }
