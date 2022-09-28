import { KeyPair, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import { GoshError } from '../../errors'
import { IGoshRoot } from '../../resources'
import { whileFinite } from '../../utils'
import {
    IGoshAdapter,
    IGosh,
    IGoshProfile,
    IGoshDao,
    IGoshProfileDao,
} from '../interfaces'
import { Gosh } from './gosh'
import { GoshDao } from './goshdao'
import { GoshProfile } from './goshprofile'
import { GoshProfileDao } from './goshprofiledao'

class GoshAdapter_0_11_0 implements IGoshAdapter {
    static version: string = '0.11.0'

    private gosh: IGosh

    client: TonClient
    goshroot: IGoshRoot

    constructor(goshroot: IGoshRoot, goshaddr: string) {
        this.goshroot = goshroot
        this.client = goshroot.account.client
        this.gosh = new Gosh(this.client, goshaddr)
    }

    async getProfile(
        username: string,
        options: { keys?: KeyPair },
    ): Promise<IGoshProfile> {
        const { keys } = options
        const address = await this.gosh.runLocal('getProfileAddr', {
            name: username.toLowerCase(),
        })
        return new GoshProfile(this.client, address.value0, keys)
    }

    async deployProfile(username: string, pubkey: string): Promise<IGoshProfile> {
        // Get profile and check it's status
        const profile = await this.getProfile(username, {})
        if (await profile.isDeployed()) return profile

        // Deploy profile
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`
        await this.gosh.run('deployProfile', { name: username.toLowerCase(), pubkey })
        const wait = await whileFinite(profile.isDeployed)
        if (!wait) throw new GoshError('Deploy profile timeout reached')
        return profile
    }

    async getProfileDao(username: string, name: string): Promise<IGoshProfileDao> {
        const profile = await this.getProfile(username, {})
        const address = await profile.runLocal('getProfileDaoAddr', {
            name: name.toLowerCase(),
        })
        return new GoshProfileDao(this.client, address.value0)
    }

    async getDao(name: string): Promise<IGoshDao> {
        const address = await this.gosh.runLocal('getAddrDao', {
            name: name.toLowerCase(),
        })
        return new GoshDao(this.client, address.value0)
    }

    async deployDao(
        name: string,
        profiles: string[],
        creator: { username: string; keys: KeyPair },
        prev?: string,
    ): Promise<IGoshDao> {
        const profile = await this.getProfile(creator.username, { keys: creator.keys })
        const dao = await this.getDao(name)
        await profile.run('deployDao', {
            goshroot: this.gosh.address,
            name: name.toLowerCase(),
            pubmem: profiles,
            previous: prev || null,
        })
        const wait = await whileFinite(dao.isDeployed)
        if (!wait) throw new GoshError('Deploy DAO timeout reached')
        return dao
    }

    async getTvmHash(data: string | Buffer): Promise<string> {
        const state = Buffer.isBuffer(data)
            ? data.toString('hex')
            : Buffer.from(data).toString('hex')
        const result = await this.gosh.runLocal('getHash', {
            state,
        })
        return result.value0
    }
}

export { GoshAdapter_0_11_0 }
