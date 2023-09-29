import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from './contract'
import TIP3WalletABI from './abi/tip3wallet.abi.json'

export class TIP3Wallet extends BaseContract {
    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super(client, TIP3WalletABI, address, { keys })
    }

    async getBalance() {
        const details = await this.runLocal('getDetails', {})
        return parseInt(details.balance) / 10 ** parseInt(details.decimals)
    }

    async withdraw(params: { amount: number; l1addr: string }) {
        const { amount, l1addr } = params

        await this.run('burnTokens', {
            _answer_id: 0,
            tokens: amount.toString(),
            to: l1addr,
        })
    }
}
