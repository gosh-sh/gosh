import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshTopic } from '../interfaces'

class GoshTopic extends BaseContract implements IGoshTopic {
    static key: string = 'topic'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshTopic.key, address, { version: GoshTopic.version })
    }
}

export { GoshTopic }
