import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import HackathonABI from './abi/hackathon.abi.json'

export class Hackathon extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, HackathonABI, address)
    }

    async getDetails() {
        const details = await this.runLocal('getDetails', {})
        return {
            prize_wallets: details.value0,
            prize_distribution: details.value1,
            name: details.value2,
            is_ready: details.value3,
            metadata: JSON.parse(details.value4),
        }
    }
}
