import { TonClient } from '@eversdk/core'
import isUtf8 from 'isutf8'
import { Buffer } from 'buffer'
import { BaseContract } from '../../blockchain/contract'
import SnapshotABI from './abi/snapshot.abi.json'
import { goshipfs, zstd } from '../../blockchain/utils'
import { TGoshSnapshotDetails } from '../types/repository.types'

export class GoshShapshot extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, SnapshotABI, address)
  }

  async getContent(commit_name?: string) {
    const data = await this.runLocal('getSnapshot', {})
    const {
      temporaryCommit,
      temporarySnapData,
      temporaryIpfs,
      approvedCommit,
      approvedSnapData,
      approvedIpfs,
      baseCommit,
      isSnapReady,
      isPin,
    } = data

    // Parse temporary data
    const temporary: TGoshSnapshotDetails['temporary'] = {
      commit_name: temporaryCommit,
      compressed: temporarySnapData,
      ipfs_id: temporaryIpfs,
      onchain_content: null,
      content: null,
      is_binary: false,
    }

    if (temporary.compressed) {
      const compressed = Buffer.from(temporary.compressed, 'hex').toString('base64')
      const decompressed = await zstd.decompress(compressed, true)
      temporary.onchain_content = decompressed
      temporary.content = decompressed
    }
    if (temporary.ipfs_id) {
      const compressed = (await goshipfs.read(temporary.ipfs_id)).toString()
      const decompressed = await zstd.decompress(compressed, false)
      const buffer = Buffer.from(decompressed, 'base64')
      if (isUtf8(buffer)) {
        temporary.content = buffer.toString()
      } else {
        temporary.content = buffer
        temporary.is_binary = true
      }
    }

    // Parse approved data
    const approved: TGoshSnapshotDetails['approved'] = {
      commit_name: approvedCommit,
      compressed: approvedSnapData,
      ipfs_id: approvedIpfs,
      onchain_content: temporary.onchain_content,
      content: temporary.content,
      is_binary: temporary.is_binary,
    }

    if (approved.compressed && approved.commit_name !== temporary.commit_name) {
      const compressed = Buffer.from(approved.compressed, 'hex').toString('base64')
      const decompressed = await zstd.decompress(compressed, true)
      approved.onchain_content = decompressed
      approved.content = decompressed
    }
    if (approved.ipfs_id && approved.commit_name !== temporary.commit_name) {
      const compressed = (await goshipfs.read(approved.ipfs_id)).toString()
      const decompressed = await zstd.decompress(compressed, false)
      const buffer = Buffer.from(decompressed, 'base64')
      if (isUtf8(buffer)) {
        approved.content = buffer.toString()
      } else {
        approved.content = buffer
        approved.is_binary = true
      }
    }

    return {
      base_commit_name: baseCommit,
      is_ready: isSnapReady,
      is_pin: isPin,
      temporary,
      approved,
    }
  }
}
