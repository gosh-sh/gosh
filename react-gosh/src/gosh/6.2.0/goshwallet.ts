import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshWallet } from '../interfaces'
import { TAddress } from '../../types'

class GoshWallet extends BaseContract implements IGoshWallet {
    static key: string = 'goshwallet'
    static version = '6.2.0'

    constructor(client: TonClient, address: TAddress, optional?: { keys?: KeyPair }) {
        super(client, GoshWallet.key, address, {
            version: GoshWallet.version,
            keys: optional?.keys,
        })
    }
}

export { GoshWallet }
