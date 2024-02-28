import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshTree } from '../interfaces'

class GoshTree extends BaseContract implements IGoshTree {
    static key: string = 'tree'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshTree.key, address, { version: GoshTree.version })
    }
}

export { GoshTree }
