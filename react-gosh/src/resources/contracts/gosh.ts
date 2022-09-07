import { AccountType } from '@eversdk/appkit'
import { TonClient } from '@eversdk/core'
import { sleep } from '../../utils'
import { BaseContract } from './base'
import { GoshProfile } from './goshprofile'
import { IGosh, IGoshProfile } from './interfaces'

class Gosh extends BaseContract implements IGosh {
    static key: string = 'gosh'

    constructor(client: TonClient, address: string, version: string) {
        super(client, Gosh.key, address, { version })
    }

    async deployProfile(pubkey: string): Promise<IGoshProfile> {
        // Get profile address and check it's status
        const profileAddr = await this.getProfileAddr(pubkey)
        // TODO: version
        const profile = new GoshProfile(this.account.client, profileAddr)
        const acc = await profile.account.getAccount()
        if (acc.acc_type === AccountType.active) return profile

        // If profile is not active (deployed), deploy and wait for status `active`
        await this.run('deployProfile', { pubkey })
        while (true) {
            const acc = await profile.account.getAccount()
            console.debug('[Create profile]: Wait for account', acc)
            if (acc.acc_type === AccountType.active) break
            await sleep(5000)
        }
        return profile
    }

    async getDaoAddr(name: string): Promise<string> {
        const result = await this.account.runLocal('getAddrDao', { name })
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
            name,
            dao: daoName,
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
            daoName,
            repoName,
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

    async getProfileAddr(pubkey: string): Promise<string> {
        const result = await this.account.runLocal('getProfileAddr', { pubkey })
        return result.decoded?.output.value0
    }
}

export { Gosh }
