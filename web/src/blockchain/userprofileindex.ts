import { TonClient } from '@eversdk/core'
import { BaseContract } from './contract'
import ProfileIndexABI from './abi/profileindex.abi.json'

export class UserProfileIndex extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, ProfileIndexABI, address)
  }
}
