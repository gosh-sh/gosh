import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { IGoshRoot } from './interfaces'

class GoshRoot extends BaseContract implements IGoshRoot {
    static key: string = 'versioncontroller'

    constructor(client: TonClient, address: string) {
        super(client, GoshRoot.key, address)
    }
}

export { GoshRoot }
