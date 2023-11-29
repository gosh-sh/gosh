import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshSmvClient } from '../interfaces'

class GoshSmvClient extends BaseContract implements IGoshSmvClient {
    static key: string = 'smvclient'
    static version = '6.2.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshSmvClient.key, address, { version: GoshSmvClient.version })
    }
}

export { GoshSmvClient }
