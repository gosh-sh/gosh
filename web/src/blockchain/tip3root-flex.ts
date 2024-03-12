import { KeyPair, TonClient } from '@eversdk/core'
import { GoshError } from '../errors'
import TIP3RootABI from './abi/tip3root-flex.abi.json'
import { BaseContract } from './contract'
import { TIP3WalletFlex } from './tip3wallet-flex'

export class TIP3RootFlex extends BaseContract {
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
      return new TIP3WalletFlex(this.client, address, keys)
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
    return new TIP3WalletFlex(this.client, value0, keys)
  }
}
