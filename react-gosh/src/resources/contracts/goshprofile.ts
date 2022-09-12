import { AccountType } from '@eversdk/appkit'
import { KeyPair, TonClient } from '@eversdk/core'
import { AppConfig } from '../../appconfig'
import { EGoshError, GoshError } from '../../errors'
import { sleep } from '../../utils'
import { BaseContract } from './base'
import { GoshDao } from './goshdao'
import { GoshProfileDao } from './goshprofiledao'
import { GoshWallet } from './goshwallet'
import { IGosh, IGoshDao, IGoshProfile, IGoshWallet } from './interfaces'

class GoshProfile extends BaseContract implements IGoshProfile {
    static key: string = 'profile'

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super(client, GoshProfile.key, address, { keys })
    }

    async setGoshAddr(addr: string): Promise<void> {
        await this.run('setNewGoshRoot', { goshroot: addr })
    }

    async deployDao(gosh: IGosh, name: string, prevAddr?: string): Promise<IGoshDao> {
        const daoAddr = await gosh.getDaoAddr(name)
        const dao = new GoshDao(this.account.client, daoAddr, gosh.version)
        await this.run('deployDao', {
            goshroot: gosh.address,
            name: name.toLowerCase(),
            previous: prevAddr || null,
        })
        // TODO: Remove this log
        console.debug('Deploy dao: wait for account', daoAddr)
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
}

export { GoshProfile }
