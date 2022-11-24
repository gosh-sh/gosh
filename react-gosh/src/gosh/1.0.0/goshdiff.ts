import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshDiff } from '../interfaces'

class GoshDiff extends BaseContract implements IGoshDiff {
    static key: string = 'diff'
    static version = '1.0.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshDiff.key, address, { version: GoshDiff.version })
    }
}

export { GoshDiff }
