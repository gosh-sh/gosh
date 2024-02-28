import { TonClient } from '@eversdk/core'
import { TAddress } from '../../types'
import { BaseContract } from '../base'
import { IGoshCommitTag } from '../interfaces'

class GoshCommitTag extends BaseContract implements IGoshCommitTag {
    static key: string = 'tag'
    static version = '6.3.0'

    constructor(client: TonClient, address: TAddress) {
        super(client, GoshCommitTag.key, address, { version: GoshCommitTag.version })
    }
}

export { GoshCommitTag }
