import { TonClient } from '@eversdk/core'
import { TGoshDiff } from '../../types'
import { BaseContract } from '../base'
import { IGoshDiff } from '../interfaces'

class GoshDiff extends BaseContract implements IGoshDiff {
    static key: string = 'diff'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshDiff.key, address, { version: GoshDiff.version })
    }

    async getNextAddr(): Promise<string> {
        const result = await this.account.runLocal('getNextAdress', {})
        return result.decoded?.output.value0
    }

    async getDiffs(): Promise<TGoshDiff[]> {
        const result = await this.account.runLocal('getdiffs', {})
        return result.decoded?.output.value0
    }
}

export { GoshDiff }
