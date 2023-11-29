import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshTask } from '../interfaces'

class GoshTask extends BaseContract implements IGoshTask {
    static key: string = 'task'
    static version = '6.2.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshTask.key, address, { version: GoshTask.version })
    }
}

export { GoshTask }
