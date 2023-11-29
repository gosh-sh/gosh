import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshBigTask } from '../interfaces'

class GoshBigTask extends BaseContract implements IGoshBigTask {
    static key: string = 'bigtask'
    static version = '6.2.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshBigTask.key, address, { version: GoshBigTask.version })
    }
}

export { GoshBigTask }
