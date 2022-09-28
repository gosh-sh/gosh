import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { Gosh } from './gosh'
import { IGosh, IGoshRoot } from './interfaces'

class GoshRoot extends BaseContract implements IGoshRoot {
    static key: string = 'root'

    constructor(client: TonClient, address: string) {
        super(client, GoshRoot.key, address)
    }

    async getGosh(version: string): Promise<IGosh> {
        const address = await this.getGoshAddr(version)
        return new Gosh(this.account.client, address)
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
