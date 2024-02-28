import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshRepository } from '../interfaces'

class GoshRepository extends BaseContract implements IGoshRepository {
    static key: string = 'repository'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshRepository.key, address, { version: GoshRepository.version })
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getName', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }
}

export { GoshRepository }
