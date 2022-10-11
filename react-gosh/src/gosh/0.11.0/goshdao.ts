import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshDao } from '../interfaces'

class GoshDao extends BaseContract implements IGoshDao {
    static key: string = 'goshdao'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshDao.key, address, { version: GoshDao.version })
    }

    /** Old interface methods */
    async getWallets(): Promise<string[]> {
        const result = await this.account.runLocal('getWallets', {})
        return result.decoded?.output.value0
    }

    // async mint(amount: number, recipient: string, daoOwnerKeys: KeyPair): Promise<void> {
    //     const tokenRoot = await this.getSmvRootTokenAddr()
    //     await this.run(
    //         'mint',
    //         {
    //             tokenRoot,
    //             amount,
    //             recipient,
    //             deployWalletValue: 0,
    //             remainingGasTo: this.address,
    //             notify: true,
    //             payload: '',
    //         },
    //         {
    //             signer: signerKeys(daoOwnerKeys),
    //         },
    //     )
    // }
}

export { GoshDao }
