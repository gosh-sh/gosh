import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshSnapshot } from '../interfaces'

class GoshSnapshot extends BaseContract implements IGoshSnapshot {
    static key: string = 'snapshot'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshSnapshot.key, address, { version: GoshSnapshot.version })
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getName', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }
}

export { GoshSnapshot }
