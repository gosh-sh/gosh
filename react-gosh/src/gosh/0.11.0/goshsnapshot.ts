import { TonClient } from '@eversdk/core'
import { loadFromIPFS, zstd } from '../../helpers'
import { EGoshBlobFlag, TGoshTreeItem } from '../../types'
import { BaseContract } from '../base'
import { IGoshSnapshot } from '../interfaces'
import isUtf8 from 'isutf8'

class GoshSnapshot extends BaseContract implements IGoshSnapshot {
    static key: string = 'snapshot'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshSnapshot.key, address, { version: GoshSnapshot.version })
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {})
        return result.decoded?.output.value0
    }

    async getSnapshot(
        commitName: string,
        treeItem: TGoshTreeItem,
    ): Promise<{ content: string | Buffer; patched: string; isIpfs: boolean }> {
        // Read snapshot data
        let patched = ''
        let ipfs = null
        const result = await this.account.runLocal('getSnapshot', {})
        const { value0, value1, value2, value4, value5 } = result.decoded?.output

        if (value0 === commitName) {
            patched = value1
            ipfs = value2
        } else {
            patched = value4
            ipfs = value5
        }

        if (!patched && !ipfs) return { content: '', patched: '', isIpfs: false }

        // Always read patch (may be needed for commit history)
        let patchedRaw = ''
        if (patched) {
            patchedRaw = Buffer.from(patched, 'hex').toString('base64')
            patchedRaw = await zstd.decompress(this.account.client, patchedRaw, true)
        }

        // Prepare content for whole app usage
        let content: Buffer | string
        if (ipfs) {
            content = await loadFromIPFS(ipfs)
            content = content.toString()
        } else {
            content = Buffer.from(patched, 'hex').toString('base64')
        }

        // Apply flags
        const { flags } = treeItem
        if ((flags & EGoshBlobFlag.COMPRESSED) === EGoshBlobFlag.COMPRESSED) {
            content = await zstd.decompress(this.account.client, content, false)
            content = Buffer.from(content, 'base64')
        }
        // if ((flags & EGoshBlobFlag.BINARY) !== EGoshBlobFlag.BINARY) {
        //     content = content.toString()
        // }

        // Try to check if valid utf8
        if (Buffer.isBuffer(content) && isUtf8(content)) content = content.toString()

        return { content, patched: patchedRaw, isIpfs: !!ipfs }
    }

    async getRepoAddr(): Promise<string> {
        const result = await this.account.runLocal('getBranchAdress', {})
        return result.decoded?.output.value0
    }
}

export { GoshSnapshot }
