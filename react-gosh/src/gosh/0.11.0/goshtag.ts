import { TonClient } from '@eversdk/core'
import { TGoshTagDetails } from '../../types'
import { BaseContract } from '../base'
import { IGoshTag } from '../interfaces'

class GoshTag extends BaseContract implements IGoshTag {
    static key: string = 'tag'
    static version = '0.11.0'
    meta?: IGoshTag['meta']

    constructor(client: TonClient, address: string) {
        super(client, GoshTag.key, address, { version: GoshTag.version })
    }

    async load(): Promise<void> {
        this.meta = {
            content: await this.getContent(),
        }
    }

    async getDetails(): Promise<TGoshTagDetails> {
        return {
            commit: await this.getCommit(),
            content: await this.getContent(),
        }
    }

    async getCommit(): Promise<string> {
        const result = await this.account.runLocal('getCommit', {})
        return result.decoded?.output.value0
    }

    async getContent(): Promise<string> {
        const result = await this.account.runLocal('getContent', {})
        return result.decoded?.output.value0
    }
}

export { GoshTag }
