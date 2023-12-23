import { TonClient } from '@eversdk/core'
import { BaseContract } from './contract'
import DaoProfileABI from './abi/profiledao.abi.json'

export class DaoProfile extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, DaoProfileABI, address)
  }
}
