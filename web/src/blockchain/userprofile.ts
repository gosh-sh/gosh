import { KeyPair, signerKeys, TonClient } from '@eversdk/core'
import { BaseContract } from './contract'
import { whileFinite } from '../utils'
// import { executeByChunk } from '../helpers'
import UserProfileABI from './abi/profile.abi.json'
import { DaoProfile } from './daoprofile'
import { EGoshError, GoshError } from '../errors'
import { TSystemContract } from '../types/blockchain.types'

export class UserProfile extends BaseContract {
    static key: string = 'profile'

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super(client, UserProfileABI, address, { keys })
    }

    async isOwnerPubkey(pubkey: string): Promise<boolean> {
        if (!pubkey.startsWith('0x')) {
            pubkey = `0x${pubkey}`
        }
        const result = await this.runLocal('isPubkeyCorrect', { pubkey })
        return result.value0
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getName', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    async getDaoProfile(name: string) {
        const { value0 } = await this.runLocal('getProfileDaoAddr', { name }, undefined, {
            useCachedBoc: true,
        })
        return new DaoProfile(this.account.client, value0)
    }

    async getPubkeys(): Promise<string[]> {
        const { value0 } = await this.runLocal('getAccess', {})
        return Object.keys(value0)
    }

    async createDao(
        systemcontract: TSystemContract,
        name: string,
        memberAddr: string[],
        prevAddr?: string | null,
    ) {
        if (!prevAddr) {
            const profileDao = await this.getDaoProfile(name)
            if (await profileDao.isDeployed()) {
                throw new GoshError(EGoshError.DAO_EXISTS)
            }
        }

        let isCompletelyDeployed = false
        await this.account.subscribeMessages(
            'body msg_type',
            async ({ body, msg_type }) => {
                const decoded = await this.decodeMessageBody(body, +msg_type)
                if (decoded?.name === 'deployedWallet') {
                    await this.account.free()
                    isCompletelyDeployed = true
                }
            },
        )

        const dao = await systemcontract.getDao({ name })
        await this.run('deployDao', {
            systemcontract: systemcontract.address,
            name,
            pubmem: memberAddr,
            previous: prevAddr || null,
        })

        if (!(await whileFinite(async () => await dao.isDeployed()))) {
            await this.account.free()
            throw new GoshError('Deploy DAO timeout reached')
        }

        if (!(await whileFinite(() => isCompletelyDeployed, 1000))) {
            await this.account.free()
            throw new GoshError('Deploy DAO timeout reached')
        }

        return dao
    }

    // async setGoshAddress(address: TAddress): Promise<void> {
    //     await this.run('setNewSystemContract', { systemcontract: address })
    // }

    async turnOn(wallet: string, pubkey: string): Promise<void> {
        if (!pubkey.startsWith('0x')) {
            pubkey = `0x${pubkey}`
        }
        await this.run('turnOn', { wallet, pubkey })
    }
}
