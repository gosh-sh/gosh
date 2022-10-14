import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGosh } from '../interfaces'

class Gosh extends BaseContract implements IGosh {
    static key: string = 'gosh'
    static version = '0.11.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, Gosh.key, address, { version: Gosh.version })
    }
}

export { Gosh }
