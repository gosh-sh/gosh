import { TonClient } from '@eversdk/core'
import { TGoshDiff } from '../../types'
import { BaseContract } from './base'
import { IGoshDiff } from './interfaces'

class GoshDiff extends BaseContract implements IGoshDiff {
    static key: string = 'diff'

    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshDiff.key, address, { version })
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
