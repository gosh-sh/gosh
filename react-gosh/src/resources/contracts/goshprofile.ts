import { KeyPair, TonClient } from '@eversdk/core'
import { sleep } from '../../utils'
import { BaseContract } from './base'
import { GoshDao } from './goshdao'
import { GoshProfileDao } from './goshprofiledao'
import { IGosh, IGoshDao, IGoshProfile, IGoshProfileDao } from './interfaces'

class GoshProfile extends BaseContract implements IGoshProfile {
    static key: string = 'profile'

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super(client, GoshProfile.key, address, { keys })
    }

    async setGoshAddr(addr: string): Promise<void> {
        await this.run('setNewGoshRoot', { goshroot: addr })
    }

    async deployDao(
        gosh: IGosh,
        name: string,
        profileAddr: string[],
        prevAddr?: string,
    ): Promise<IGoshDao> {
        const daoAddr = await gosh.getDaoAddr(name)
        const dao = new GoshDao(this.account.client, daoAddr)
        await this.run('deployDao', {
            goshroot: gosh.address,
            name: name.toLowerCase(),
            pubmem: profileAddr,
            previous: prevAddr || null,
        })
        while (true) {
            if (await dao.isDeployed()) return dao
            await sleep(5000)
        }
    }

    async turnOn(walletAddr: string, pubkey: string): Promise<void> {
        await this.run('turnOn', { wallet: walletAddr, pubkey })
    }

    async isPubkeyCorrect(pubkey: string): Promise<boolean> {
        const result = await this.account.runLocal('isPubkeyCorrect', { pubkey })
        return result.decoded?.output.value0
    }

    async getCurrentGoshAddr(): Promise<string> {
        const result = await this.account.runLocal('getCurrentGoshRoot', {})
        return result.decoded?.output.value0
    }

    async getProfileDaoAddr(name: string): Promise<string> {
        const result = await this.account.runLocal('getProfileDaoAddr', {
            name: name.toLowerCase(),
        })
        return result.decoded?.output.value0
    }

    async getProfileDao(name: string): Promise<IGoshProfileDao> {
        const address = await this.getProfileDaoAddr(name)
        return new GoshProfileDao(this.account.client, address)
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {})
        return result.decoded?.output.value0
    }
}

export { GoshProfile }
