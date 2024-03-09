import { KeyPair, TonClient } from '@eversdk/core'
import TIP3WalletABI from './abi/tip3wallet-broxus.abi.json'
import { BaseContract } from './contract'

export class TIP3WalletBroxus extends BaseContract {
  constructor(client: TonClient, address: string, keys?: KeyPair) {
    super(client, TIP3WalletABI, address, { keys })
  }

  async getBalance() {
    const { value0 } = await this.runLocal('balance', { answerId: 0 })
    return BigInt(value0)
  }
}
