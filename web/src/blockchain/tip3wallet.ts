import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from './contract'
import TIP3WalletABI from './abi/tip3wallet.abi.json'

export class TIP3Wallet extends BaseContract {
  constructor(client: TonClient, address: string, keys?: KeyPair) {
    super(client, TIP3WalletABI, address, { keys })
  }

  async getBalance() {
    const details = await this.runLocal('getDetails', {})

    // Trigger ask for balance
    const nativestr = await this.account.getBalance()
    const nativeint = parseInt(nativestr, 16)
    if (nativeint < 10 * 10 ** 9) {
      await this.run('lock', { _answer_id: 0, tokens: 0 })
    }

    return BigInt(details.balance)
  }

  async withdraw(params: { amount: bigint; l1addr: string }) {
    const { amount, l1addr } = params

    await this.run('burnTokens', {
      _answer_id: 0,
      tokens: amount.toString(),
      to: l1addr,
    })
  }

  async transfer(params: { address: string; amount: bigint }) {
    const { address, amount } = params

    await this.run('transfer', {
      _answer_id: 0,
      answer_addr: null,
      to: address,
      tokens: amount.toString(),
      evers: BigInt(4 * 10 ** 9).toString(),
      return_ownership: 0,
      notify_payload: null,
    })
  }

  async createEmptyWallet(params: { pubkey: string }) {
    const { pubkey } = params
    await this.run('transferToRecipient', {
      _answer_id: 0,
      answer_addr: null,
      to: { pubkey, owner: null },
      tokens: 0,
      evers: BigInt(4 * 10 ** 9).toString(),
      keep_evers: BigInt(1 * 10 ** 9).toString(),
      deploy: true,
      return_ownership: 0,
      notify_payload: null,
    })
  }
}
