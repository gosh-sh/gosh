import { KeyPair, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import { EGoshError, GoshError } from '../../errors'
import { TValidationResult } from '../../types'
import { whileFinite } from '../../utils'
import { GoshAdapterFactory } from '../factories'
import {
    IGoshAdapter,
    IGoshRoot,
    IGoshProfile,
    IGoshProfileDao,
    IGosh,
    IGoshDao,
    IGoshRepository,
} from '../interfaces'
import { Gosh } from './gosh'
import { GoshDao } from './goshdao'
import { GoshProfile } from '../goshprofile'
import { GoshProfileDao } from '../goshprofiledao'
import { GoshRepository } from './goshrepository'

class GoshAdapter_0_11_0 implements IGoshAdapter {
    private static instance: GoshAdapter_0_11_0
    private profile?: IGoshProfile
    private keys: KeyPair[] = []

    static version: string = '0.11.0'

    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    private constructor(goshroot: IGoshRoot, goshaddr: string) {
        this.goshroot = goshroot
        this.client = goshroot.account.client
        this.gosh = new Gosh(this.client, goshaddr)
    }

    static getInstance(goshroot: IGoshRoot, goshaddr: string): GoshAdapter_0_11_0 {
        if (!GoshAdapter_0_11_0.instance) {
            GoshAdapter_0_11_0.instance = new GoshAdapter_0_11_0(goshroot, goshaddr)
        }
        return GoshAdapter_0_11_0.instance
    }

    async auth(username: string, keys: KeyPair[]): Promise<void> {
        if (this.profile) return

        this.profile = await this.getProfile(username)
        this.keys = keys
    }

    async authReset(): Promise<void> {
        this.profile = undefined
        this.keys = []
    }

    async getProfile(username: string): Promise<IGoshProfile> {
        const address = await this.gosh.runLocal('getProfileAddr', {
            name: username.toLowerCase(),
        })
        return new GoshProfile(this.client, address.value0)
    }

    async deployProfile(username: string, pubkey: string): Promise<IGoshProfile> {
        // Get profile and check it's status
        const profile = await this.getProfile(username)
        if (await profile.isDeployed()) return profile

        // Deploy profile
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`
        await this.gosh.run('deployProfile', { name: username.toLowerCase(), pubkey })
        const wait = await whileFinite(() => profile.isDeployed())
        if (!wait) throw new GoshError('Deploy profile timeout reached')
        return profile
    }

    async getDao(options: { name?: string; address?: string }): Promise<IGoshDao> {
        const { name, address } = options
        if (address) return new GoshDao(this.client, address)

        if (!name) throw new GoshError('DAO name undefined')
        const result = await this.gosh.runLocal('getAddrDao', {
            name: name.toLowerCase(),
        })
        return new GoshDao(this.client, result.value0)
    }

    async getRepo(options: {
        name?: string
        daoName?: string
        address?: string
    }): Promise<IGoshRepository> {
        const { name, daoName, address } = options
        if (address) return new GoshRepository(this.client, address)

        if (!name || !daoName) throw new GoshError('Repo name or DAO name undefined')
        const result = await this.gosh.runLocal('getAddrRepository', {
            name: name.toLowerCase(),
            dao: daoName.toLowerCase(),
        })
        return new GoshRepository(this.client, result.value0)
    }

    async getRepoCodeHash(dao: string): Promise<string> {
        const code = await this.gosh.runLocal('getRepoDaoCode', {
            dao,
        })
        const hash = await this.client.boc.get_boc_hash({
            boc: code.value0,
        })
        return hash.hash
    }

    async getWalletCodeHash(): Promise<string> {
        if (!this.profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const code = await this.gosh.runLocal('getDaoWalletCode', {
            pubaddr: this.profile.address,
        })
        const hash = await this.client.boc.get_boc_hash({
            boc: code.value0,
        })
        return hash.hash
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

    async getSmvPlatformCode(): Promise<string> {
        const result = await this.gosh.runLocal('getSMVPlatformCode', {})
        return result.value0
    }

    isValidDaoName(name: string): TValidationResult {
        const matches = name.match(/^[\w-]+$/g)
        if (!matches || matches[0] !== name) {
            return { valid: false, reason: 'Name has incorrect symbols' }
        }
        if (name.length > 64) {
            return { valid: false, reason: 'Name is too long (>64)' }
        }
        return { valid: true }
    }
}

export { GoshAdapter_0_11_0 }
