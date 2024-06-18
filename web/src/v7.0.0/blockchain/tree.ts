import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import TreeABI from './abi/tree.abi.json'
import { TGoshTreeItem } from '../types/repository.types'

export class GoshTree extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, TreeABI, address)
  }

  async getDetails(): Promise<TGoshTreeItem[]> {
    const { value0 } = await this.runLocal('gettree', {}, undefined, {
      useCachedBoc: true,
    })
    return Object.values(value0).map((item: any) => ({
      name: item.name,
      type: item.typeObj,
      mode: item.mode,
      flags: parseInt(item.flags),
      sha1: item.gitsha,
      commit_name: item.commit,
      file_tvm_sha256: item.tvmshafile,
      tree_tvm_sha256: item.tvmshatree,
    }))
  }
}
