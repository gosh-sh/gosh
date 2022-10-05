import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshSmvClient } from '../interfaces'

class GoshSmvClient extends BaseContract implements IGoshSmvClient {
    static key: string = 'smvclient'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshSmvClient.key, address, { version: GoshSmvClient.version })
    }

    async getLockedAmount(): Promise<number> {
        const result = await this.account.runLocal('_getLockedAmount', {})
        return +result.decoded?.output.value0
    }
}

export { GoshSmvClient }
