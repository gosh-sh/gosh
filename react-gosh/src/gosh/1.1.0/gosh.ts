import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGosh } from '../interfaces'

class Gosh extends BaseContract implements IGosh {
    static key: string = 'systemcontract'
    static version = '1.1.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, Gosh.key, address, { version: Gosh.version })
    }
}

export { Gosh }
