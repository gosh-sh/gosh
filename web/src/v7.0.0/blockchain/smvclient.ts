import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import SmvClientABI from './abi/smvclient.abi.json'

export class SmvClient extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, SmvClientABI, address)
  }
}
