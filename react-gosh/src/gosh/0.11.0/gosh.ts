import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGosh } from '../interfaces'

class Gosh extends BaseContract implements IGosh {
    static key: string = 'gosh'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, Gosh.key, address, { version: Gosh.version })
    }

    /** Old interface methods */
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

    async getProfileAddr(username: string): Promise<string> {
        const result = await this.account.runLocal('getProfileAddr', {
            name: username.toLowerCase(),
        })
        return result.decoded?.output.value0
    }
}

export { Gosh }
