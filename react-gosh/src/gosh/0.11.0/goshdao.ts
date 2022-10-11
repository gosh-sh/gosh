import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshDao } from '../interfaces'

class GoshDao extends BaseContract implements IGoshDao {
    static key: string = 'goshdao'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshDao.key, address, { version: GoshDao.version })
    }
}

export { GoshDao }
