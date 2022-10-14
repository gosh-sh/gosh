import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshTag } from '../interfaces'

class GoshTag extends BaseContract implements IGoshTag {
    static key: string = 'tag'
    static version = '0.11.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshTag.key, address, { version: GoshTag.version })
    }
}

export { GoshTag }
