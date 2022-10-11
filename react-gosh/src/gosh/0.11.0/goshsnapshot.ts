import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshSnapshot } from '../interfaces'

class GoshSnapshot extends BaseContract implements IGoshSnapshot {
    static key: string = 'snapshot'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshSnapshot.key, address, { version: GoshSnapshot.version })
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {})
        return result.decoded?.output.value0
    }
}

export { GoshSnapshot }
