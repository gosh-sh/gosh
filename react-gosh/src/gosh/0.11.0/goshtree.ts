import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshTree } from '../interfaces'

class GoshTree extends BaseContract implements IGoshTree {
    static key: string = 'tree'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshTree.key, address, { version: GoshTree.version })
    }
}

export { GoshTree }
