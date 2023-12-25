import { TonClient } from '@eversdk/core'
import isUtf8 from 'isutf8'
import { Buffer } from 'buffer'
import { BaseContract } from '../../blockchain/contract'
import SnapshotABI from './abi/snapshot.abi.json'
import { goshipfs, zstd } from '../../blockchain/utils'

export class GoshShapshot extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, SnapshotABI, address)
  }

  async getContent(commitname?: string) {
    const result: {
      onchain: { commit: string; content: string }
      content: string | Buffer
      ipfs: boolean
    } = {
      onchain: { commit: '', content: '' },
      content: '',
      ipfs: false,
    }

    const data = await this.runLocal('getSnapshot', {})
    const { value0, value1, value2, value3, value4, value5, value6 } = data

    const patched = !commitname || value0 === commitname ? value1 : value4
    const ipfscid = !commitname || value0 === commitname ? value2 : value5

    // Read onchain snapshot content
    if (patched) {
      const compressed = Buffer.from(patched, 'hex').toString('base64')
      const content = await zstd.decompress(compressed, true)
      result.onchain = {
        commit: !commitname || value0 === commitname ? value0 : value3,
        content: content,
      }
      result.content = content
      result.ipfs = false
    }

    // Read ipfs snapshot content
    if (ipfscid) {
      const compressed = (await goshipfs.read(ipfscid)).toString()
      const decompressed = await zstd.decompress(compressed, false)
      const buffer = Buffer.from(decompressed, 'base64')
      result.onchain = { commit: value6, content: result.content as string }
      result.content = isUtf8(buffer) ? buffer.toString() : buffer
      result.ipfs = true
    }

    return result
  }
}
