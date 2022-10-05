import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshContentSignature } from '../interfaces'

class GoshContentSignature extends BaseContract implements IGoshContentSignature {
    static key: string = 'content-signature'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshContentSignature.key, address, {
            version: GoshContentSignature.version,
        })
    }

    async getContent(): Promise<string> {
        const result = await this.account.runLocal('getContent', {})
        return result.decoded?.output.value0
    }
}

export { GoshContentSignature }
