import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshProfileIndex } from '../interfaces'

class GoshProfileIndex extends BaseContract implements IGoshProfileIndex {
    static key: string = 'profileindex'
    static version = '1.0.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshProfileIndex.key, address, {
            version: GoshProfileIndex.version,
        })
    }
}

export { GoshProfileIndex }
