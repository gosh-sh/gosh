import { TonClient } from '@eversdk/core'
import { TGoshTreeItem } from '../../types'
import { BaseContract } from './base'
import { IGoshTree } from './interfaces'

class GoshTree extends BaseContract implements IGoshTree {
    static key: string = 'tree'

    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshTree.key, address, { version })
    }

    async getTree(): Promise<{ tree: TGoshTreeItem[]; ipfs: string }> {
        const result = await this.account.runLocal('gettree', {})
        const tree = Object.values(result.decoded?.output.value0).map((item: any) => ({
            flags: +item.flags,
            mode: item.mode,
            type: item.typeObj,
            sha1: item.sha1,
            sha256: item.sha256,
            path: '',
            name: item.name,
        }))
        return { tree, ipfs: result.decoded?.output.value1 }
    }

    async getSha(): Promise<any> {
        const result = await this.account.runLocal('getsha', {})
        return result.decoded?.output
    }
}

export { GoshTree }
