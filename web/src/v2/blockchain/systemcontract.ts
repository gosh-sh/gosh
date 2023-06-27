import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import GoshABI from './abi/systemcontract.abi.json'
import { Dao } from './dao'
import { GoshError } from '../../errors'
import { Repository } from './repository'
import { VersionController } from '../../blockchain/versioncontroller'
import { AppConfig } from '../../appconfig'
import { whileFinite } from '../../utils'

export class SystemContract extends BaseContract {
    versionController: VersionController

    constructor(client: TonClient, address: string) {
        super(client, GoshABI, address)
        this.versionController = AppConfig.goshroot
    }

    async getDao(params: { name?: string; address?: string }) {
        const { name, address } = params

        if (address) {
            return new Dao(this.client, address)
        }

        if (name) {
            const { value0 } = await this.runLocal('getAddrDao', { name }, undefined, {
                useCachedBoc: true,
            })
            return new Dao(this.client, value0)
        }

        throw new GoshError('DAO name or address required')
    }

    async getRepository(options: { path?: string; address?: string }) {
        const { path, address } = options
        if (address) {
            return new Repository(this.client, address)
        }

        if (!path) {
            throw new GoshError('Repository path is undefined')
        }
        const [dao, name] = path.split('/')
        const { value0 } = await this.runLocal(
            'getAddrRepository',
            { dao, name },
            undefined,
            { useCachedBoc: true },
        )
        return new Repository(this.client, value0)
    }

    async createUserProfile(username: string, pubkey: string) {
        // Get profile and check it's status
        const profile = await this.versionController.getUserProfile({ username })
        if (await profile.isDeployed()) {
            return profile
        }

        // Deploy profile
        await this.run('deployProfile', { name: username, pubkey })
        const wait = await whileFinite(async () => await profile.isDeployed())
        if (!wait) {
            throw new GoshError('Deploy profile timeout reached')
        }
        return profile
    }
}
