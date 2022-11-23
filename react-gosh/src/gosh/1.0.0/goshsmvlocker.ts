import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshSmvLocker } from '../interfaces'

class GoshSmvLocker extends BaseContract implements IGoshSmvLocker {
    static key: string = 'smvtokenlocker'
    static version = '1.0.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshSmvLocker.key, address, { version: GoshSmvLocker.version })
    }
}

export { GoshSmvLocker }
