import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshRepository } from '../interfaces'

class GoshRepository extends BaseContract implements IGoshRepository {
    static key: string = 'repository'
    static version = '0.11.0'

    private name?: string

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshRepository.key, address, { version: GoshRepository.version })
    }

    async getName(): Promise<string> {
        if (!this.name) {
            const { value0 } = await this.runLocal('getName', {})
            this.name = value0
        }
        return this.name!
    }
}

export { GoshRepository }
