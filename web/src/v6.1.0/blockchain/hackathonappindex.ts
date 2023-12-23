import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { THackathonAppIndex } from '../types/hackathon.types'
import HackathonAppIndexABI from './abi/hackathonappindex.abi.json'

export class HackathonAppIndex extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, HackathonAppIndexABI, address)
  }

  async getDetails(): Promise<THackathonAppIndex> {
    const { value0, value1, value2, value3, value4 } = await this.runLocal(
      'getDetails',
      {},
      undefined,
      { useCachedBoc: true },
    )
    return {
      repo_name: value4,
      name: value0,
      content: value3,
      commit: {
        address: value1,
        name: value2,
      },
    }
  }
}
