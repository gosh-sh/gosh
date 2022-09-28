import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshProfile } from '../interfaces'
import { TProfileDetails } from '../../types'

class GoshProfile extends BaseContract implements IGoshProfile {
    static key: string = 'profile'

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super(client, GoshProfile.key, address, { keys })
    }

    async getName(): Promise<string> {
        const result = await this.runLocal('getName', {})
        return result.value0
    }

    async getDetails(): Promise<TProfileDetails> {
        const custodians = await this.runLocal('getCustodians', {})
        const pubkeys = await this.runLocal('getAccess', {})
        return {
            name: await this.getName(),
            custodians: {
                list: [],
                needed: 1,
            },
        }
    }

    async isOwner(pubkey: string): Promise<boolean> {
        const result = await this.runLocal('isPubkeyCorrect', { pubkey })
        return result.value0
    }

    /** Old interface methods */
    async setGoshAddr(addr: string): Promise<void> {
        await this.run('setNewGoshRoot', { goshroot: addr })
    }

    async turnOn(walletAddr: string, pubkey: string): Promise<void> {
        await this.run('turnOn', { wallet: walletAddr, pubkey })
    }

    async getCurrentGoshAddr(): Promise<string> {
        const result = await this.account.runLocal('getCurrentGoshRoot', {})
        return result.decoded?.output.value0
    }
}

export { GoshProfile }
