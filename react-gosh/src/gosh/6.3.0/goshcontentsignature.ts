import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshContentSignature } from '../interfaces'

class GoshContentSignature extends BaseContract implements IGoshContentSignature {
    static key: string = 'content-signature'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshContentSignature.key, address, {
            version: GoshContentSignature.version,
        })
    }
}

export { GoshContentSignature }
