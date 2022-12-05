import { TonClient } from '@eversdk/core'
import { TAddress } from '../types'
import { BaseContract } from './base'
import { IGoshProfileIndex } from './interfaces'

class GoshProfileIndex extends BaseContract implements IGoshProfileIndex {
    static key: string = 'profileindex'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshProfileIndex.key, address)
    }
}

export { GoshProfileIndex }
