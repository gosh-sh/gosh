import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshSmvTokenRoot } from '../interfaces'

class GoshSmvTokenRoot extends BaseContract implements IGoshSmvTokenRoot {
    static key: string = 'tokenroot'
    static version = '6.2.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshSmvTokenRoot.key, address, {
            version: GoshSmvTokenRoot.version,
        })
    }
}

export { GoshSmvTokenRoot }
