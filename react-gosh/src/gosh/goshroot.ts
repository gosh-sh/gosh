import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { IGoshRoot } from './interfaces'

class GoshRoot extends BaseContract implements IGoshRoot {
    static key: string = 'versioncontroller'

    constructor(client: TonClient, address: string) {
        super(client, GoshRoot.key, address)
    }

    async getGoshAddr(version: string): Promise<string> {
        const result = await this.account.runLocal('getGoshAddr', { version })
        return result.decoded?.output.value0
    }

    async getVersions(): Promise<any> {
        const result = await this.account.runLocal('getVersions', {})
        return Object.values(result.decoded?.output.value0)
    }
}

export { GoshRoot }
