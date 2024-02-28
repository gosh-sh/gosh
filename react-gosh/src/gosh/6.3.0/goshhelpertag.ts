import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshHelperTag } from '../interfaces'

class GoshHelperTag extends BaseContract implements IGoshHelperTag {
    static key: string = 'taggosh'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshHelperTag.key, address, { version: GoshHelperTag.version })
    }
}

export { GoshHelperTag }
