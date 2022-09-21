import { KeyPair, TonClient } from '@eversdk/core'
import { sleep } from '../../utils'
import { BaseContract } from './base'
import { GoshProfile } from './goshprofile'
import { IGosh, IGoshProfile } from './interfaces'

class Gosh extends BaseContract implements IGosh {
    static key: string = 'gosh'

    constructor(client: TonClient, address: string, version: string) {
        super(client, Gosh.key, address, { version })
    }

    async deployProfile(username: string, pubkey: string): Promise<IGoshProfile> {
        // Get profile address and check it's status
        const profileAddr = await this.getProfileAddr(username)
        const profile = new GoshProfile(this.account.client, profileAddr)
        if (await profile.isDeployed()) return profile

        // Deploy profile
        await this.run('deployProfile', { name: username.toLowerCase(), pubkey })
        while (true) {
            if (await profile.isDeployed()) break
            await sleep(5000)
        }
        return profile
    }

    async getDaoAddr(name: string): Promise<string> {
        const result = await this.account.runLocal('getAddrDao', {
            name: name.toLowerCase(),
        })
        return result.decoded?.output.value0
    }

    async getDaoWalletCode(profileAddr: string): Promise<string> {
        const result = await this.account.runLocal('getDaoWalletCode', {
            pubaddr: profileAddr,
        })
        return result.decoded?.output.value0
    }

    async getRepoAddr(name: string, daoName: string): Promise<string> {
        const result = await this.account.runLocal('getAddrRepository', {
            name: name.toLowerCase(),
            dao: daoName.toLowerCase(),
        })
        return result.decoded?.output.value0
    }

    async getDaoRepoCode(daoAddr: string): Promise<string> {
        const result = await this.account.runLocal('getRepoDaoCode', {
            dao: daoAddr,
        })
        return result.decoded?.output.value0
    }

    async getSmvPlatformCode(): Promise<string> {
        const result = await this.account.runLocal('getSMVPlatformCode', {})
        return result.decoded?.output.value0
    }

    async getContentAddr(
        daoName: string,
        repoName: string,
        commitHash: string,
        label: string,
    ): Promise<string> {
        const result = await this.account.runLocal('getContentAdress', {
            daoName: daoName.toLowerCase(),
            repoName: repoName.toLowerCase(),
            commit: commitHash,
            label,
        })
        return result.decoded?.output.value0
    }

    async getTvmHash(data: string | Buffer): Promise<string> {
        const state = Buffer.isBuffer(data)
            ? data.toString('hex')
            : Buffer.from(data).toString('hex')
        const result = await this.account.runLocal('getHash', {
            state,
        })
        return result.decoded?.output.value0
    }

    async getProfileAddr(username: string): Promise<string> {
        const result = await this.account.runLocal('getProfileAddr', {
            name: username.toLowerCase(),
        })
        return result.decoded?.output.value0
    }

    async getProfile(username: string, keys?: KeyPair): Promise<IGoshProfile> {
        const address = await this.getProfileAddr(username)
        return new GoshProfile(this.account.client, address, keys)
    }
}

export { Gosh }
