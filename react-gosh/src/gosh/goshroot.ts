import { TonClient } from '@eversdk/core'
import { GoshError } from '../errors'
import { getAllAccounts } from '../helpers'
import { TAddress } from '../types'
import { GoshProfileIndex } from './1.0.0/goshprofileindex'
import { BaseContract } from './base'
import { IGoshProfileIndex, IGoshRoot } from './interfaces'

class GoshRoot extends BaseContract implements IGoshRoot {
    static key: string = 'versioncontroller'

    constructor(client: TonClient, address: string) {
        super(client, GoshRoot.key, address)
    }

    async getProfileIndex(options: {
        address?: TAddress
        pubkey?: string
        username?: string
    }): Promise<IGoshProfileIndex> {
        const { address, pubkey, username } = options
        if (address) return new GoshProfileIndex(this.account.client, address)

        if (!pubkey || !username) throw new GoshError('Username and/or pubkey missing')
        const pub = !pubkey.startsWith('0x') ? `0x${pubkey}` : pubkey
        const { value0 } = await this.runLocal('getProfileIndexAddr', {
            pubkey: pub,
            name: username,
        })
        return new GoshProfileIndex(this.account.client, value0)
    }

    async getProfileIndexes(
        pubkey: string,
    ): Promise<{ pubkey: string; name: string; profile: TAddress }[]> {
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`
        const { value0: code } = await this.runLocal('getProfileIndexCode', { pubkey })
        const { hash } = await this.account.client.boc.get_boc_hash({ boc: code })
        const accounts = await getAllAccounts({ filters: [`code_hash: {eq:"${hash}"}`] })
        return await Promise.all(
            accounts.map(async ({ id }) => {
                const index = await this.getProfileIndex({ address: id })
                const { value0, value1, value2 } = await index.runLocal('getData', {})
                return { pubkey: value0, name: value1, profile: value2 }
            }),
        )
    }

    async createProfileIndex(username: string, pubkey: string): Promise<void> {
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`

        const index = await this.getProfileIndex({ pubkey, username })
        if (!(await index.isDeployed())) {
            await this.run('deployProfileIndexContract', { pubkey, name: username })
        }
    }
}

export { GoshRoot }
