import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshSmvProposal } from '../interfaces'

class GoshSmvProposal extends BaseContract implements IGoshSmvProposal {
    static key: string = 'smvproposal'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshSmvProposal.key, address, { version: GoshSmvProposal.version })
    }
}

export { GoshSmvProposal }
