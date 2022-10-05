import { KeyPair, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import { EGoshError, GoshError } from '../../errors'
import { TValidationResult } from '../../types'
import { whileFinite } from '../../utils'
import {
    IGoshAdapter,
    IGoshRoot,
    IGoshProfile,
    IGosh,
    IGoshDao,
    IGoshRepository,
    IGoshWallet,
} from '../interfaces'
import { Gosh } from './gosh'
import { GoshDao } from './goshdao'
import { GoshProfile } from '../goshprofile'
import { GoshRepository } from './goshrepository'
import { GoshWallet } from './goshwallet'

class GoshAdapter_0_11_0 implements IGoshAdapter {
    private static instance: GoshAdapter_0_11_0
    private auth?: { profile: IGoshProfile; wallet: IGoshWallet; dao: IGoshDao }

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

    async setAuth(username: string, keys: KeyPair, dao: IGoshDao): Promise<void> {
        const profile = await this.getProfile(username)

        const waddress = await dao.getWalletAddr(profile.address, 0)
        const wallet = new GoshWallet(this.client, waddress, { keys })

        const accessed = await profile.getOwners()
        if (accessed.indexOf(`0x${keys.public}`) < 0) {
            await profile.turnOn(waddress, keys.public, keys)
        }

        this.auth = { profile, wallet, dao }
    }

    async resetAuth(): Promise<void> {
        this.auth = undefined
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

    async getDaoWalletCodeHash(): Promise<string> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const code = await this.gosh.runLocal('getDaoWalletCode', {
            pubaddr: this.auth.profile.address,
        })
        const hash = await this.client.boc.get_boc_hash({
            boc: code.value0,
        })
        return hash.hash
    }

    async isAuthDaoOwner(): Promise<boolean> {
        if (!this.auth) return false

        const owner = await this.auth.dao.runLocal('getOwner', {})
        return owner.value0 === this.auth.profile.address
    }

    async isAuthDaoMember(): Promise<boolean> {
        if (!this.auth) return false

        const isMember = await this.auth.dao.runLocal('isMember', {
            pubaddr: this.auth.profile.address,
        })
        return isMember.value0
    }

    async getRepository(options: {
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

    async getRepositoryCodeHash(dao: string): Promise<string> {
        const code = await this.gosh.runLocal('getRepoDaoCode', {
            dao,
        })
        const hash = await this.client.boc.get_boc_hash({
            boc: code.value0,
        })
        return hash.hash
    }

    async deployRepository(
        name: string,
        prev?: { addr: string; version: string } | undefined,
    ): Promise<IGoshRepository> {
        if (!this.auth) throw new GoshError(EGoshError.DAO_UNDEFINED)

        // Check if repo is already deployed
        const daoName = await this.auth.dao.getName()
        const repo = await this.getRepository({ name, daoName })
        if (await repo.isDeployed()) return repo

        // Deploy repo
        await this.auth.wallet.run('deployRepository', {
            nameRepo: name.toLowerCase(),
            previous: prev || null,
        })
        const wait = await whileFinite(() => repo.isDeployed())
        if (!wait) throw new GoshError('Deploy repository timeout reached')
        return repo
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
