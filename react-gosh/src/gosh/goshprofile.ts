import { KeyPair, signerKeys, TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import {
    IGoshAdapter,
    IGoshDaoAdapter,
    IGoshProfile,
    IGoshProfileDao,
} from './interfaces'
import { TProfileDetails } from '../types'
import { GoshProfileDao } from './goshprofiledao'
import { EGoshError, GoshError } from '../errors'
import { whileFinite } from '../utils'
import { GoshAdapterFactory } from './factories'

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

    async getProfileDao(name: string): Promise<IGoshProfileDao> {
        const address = await this.runLocal('getProfileDaoAddr', {
            name: name.toLowerCase(),
        })
        return new GoshProfileDao(this.account.client, address.value0)
    }

    async getDaos(): Promise<IGoshDaoAdapter[]> {
        const { messages } = await this.getMessages({ msgType: ['IntIn'] }, true, true)
        return await Promise.all(
            messages
                .filter(({ decoded }) => decoded && decoded.name === 'deployedWallet')
                .map(async ({ decoded }) => {
                    const { goshdao, ver } = decoded.value
                    const adapter = GoshAdapterFactory.create(ver)
                    return await adapter.getDao({ address: goshdao })
                }),
        )
    }

    async getOwners(): Promise<string[]> {
        const owners = await this.runLocal('getAccess', {})
        return Object.keys(owners.value0)
    }

    async isOwnerPubkey(pubkey: string): Promise<boolean> {
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`
        const result = await this.runLocal('isPubkeyCorrect', { pubkey })
        return result.value0
    }

    async deployDao(
        gosh: IGoshAdapter,
        name: string,
        members: string[],
        prev?: string | undefined,
    ): Promise<IGoshDaoAdapter> {
        const { valid, reason } = gosh.isValidDaoName(name)
        if (!valid) throw new GoshError(EGoshError.DAO_NAME_INVALID, reason)

        const profileDao = await this.getProfileDao(name)
        if (await profileDao.isDeployed()) throw new GoshError(EGoshError.DAO_EXISTS)

        const dao = await gosh.getDao({ name: name.toLowerCase() })
        await this.run('deployDao', {
            goshroot: gosh.gosh.address,
            name: name.toLowerCase(),
            pubmem: members,
            previous: prev || null,
        })
        const wait = await whileFinite(() => dao.isDeployed())
        if (!wait) throw new GoshError('Deploy DAO timeout reached')
        return dao
    }

    async turnOn(wallet: string, pubkey: string, keys: KeyPair): Promise<void> {
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`
        await this.run('turnOn', { wallet, pubkey }, { signer: signerKeys(keys) })
    }
}

export { GoshProfile }
