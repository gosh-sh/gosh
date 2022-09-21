import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { IGoshContentSignature } from './interfaces'

class GoshContentSignature extends BaseContract implements IGoshContentSignature {
    static key: string = 'content-signature'

    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshContentSignature.key, address, { version })
    }

    async getContent(): Promise<string> {
        const result = await this.account.runLocal('getContent', {})
        return result.decoded?.output.value0
    }
}

export { GoshContentSignature }
