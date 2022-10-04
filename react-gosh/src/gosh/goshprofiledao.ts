import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { IGoshProfileDao } from './interfaces'

class GoshProfileDao extends BaseContract implements IGoshProfileDao {
    static key: string = 'profiledao'

    constructor(client: TonClient, address: string) {
        super(client, GoshProfileDao.key, address)
    }
}

export { GoshProfileDao }
