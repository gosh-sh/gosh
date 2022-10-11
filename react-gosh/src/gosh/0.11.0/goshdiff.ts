import { TonClient } from '@eversdk/core'
import { TGoshDiff } from '../../types'
import { BaseContract } from '../base'
import { IGoshDiff } from '../interfaces'

class GoshDiff extends BaseContract implements IGoshDiff {
    static key: string = 'diff'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshDiff.key, address, { version: GoshDiff.version })
    }
}

export { GoshDiff }
