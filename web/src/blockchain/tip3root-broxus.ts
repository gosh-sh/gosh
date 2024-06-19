import { TonClient } from '@eversdk/core'
import TIP3RootABI from './abi/tip3root-broxus.abi.json'
import { BaseContract } from './contract'

export class TIP3RootBroxus extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, TIP3RootABI, address)
  }

  async getDetails() {
    const { value0: name } = await this.runLocal('name', { answerId: 0 })
    const { value0: symbol } = await this.runLocal('symbol', { answerId: 0 })
    const { value0: decimals } = await this.runLocal('decimals', { answerId: 0 })
    const { value0: supply } = await this.runLocal('totalSupply', { answerId: 0 })
    return { name, symbol, decimals: parseInt(decimals), supply: parseInt(supply) }
  }
}
