import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from './contract'
import TIP3RootABI from './abi/tip3root.abi.json'
import { TIP3Wallet } from './tip3wallet'
import { GoshError } from '../errors'

export class TIP3Root extends BaseContract {
  constructor(client: TonClient, address: string) {
    super(client, TIP3RootABI, address)
  }

  async getWallet(params: {
    address?: string
    data?: { pubkey: string; owneraddr?: string }
    keys?: KeyPair
  }) {
    const { address, data, keys } = params

    if (!address && !data) {
      throw new GoshError('Value error', 'Either address or data should be provided')
    }

    if (address) {
      return new TIP3Wallet(this.client, address, keys)
    }

    const { value0 } = await this.runLocal(
      'getWalletAddress',
      {
        pubkey: data!.pubkey,
        owner: data!.owneraddr,
      },
      undefined,
      { useCachedBoc: true },
    )
    return new TIP3Wallet(this.client, value0, keys)
  }
}
