import { AccountType } from '@eversdk/appkit'
import { KeyPair, TonClient } from '@eversdk/core'
import { AppConfig } from '../../appconfig'
import { sleep } from '../../utils'
import { BaseContract } from './base'
import { GoshDao } from './goshdao'
import { GoshWallet } from './goshwallet'
import { IGoshDao, IGoshProfile, IGoshWallet } from './interfaces'

class GoshProfile extends BaseContract implements IGoshProfile {
    static key: string = 'profile'

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super(client, GoshProfile.key, address, { keys })
    }

    async setGosh(goshAddr: string): Promise<void> {
        await this.run('setNewGoshRoot', { goshroot: goshAddr })
    }

    async deployDao(name: string, prevAddr?: string): Promise<IGoshDao> {
        // Get DAO address and check it's status
        // TODO: version
        const gosh = await AppConfig.goshroot.getGosh('')
        const daoAddr = await gosh.getDaoAddr(name)
        // TODO: version
        const dao = new GoshDao(this.account.client, daoAddr, '')
        const acc = await dao.account.getAccount()
        if (acc.acc_type === AccountType.active) {
            // TODO: Check DAO ownership and dao
            // const daoRootPubkey = await dao.getRootPubkey()
            // if (daoRootPubkey !== ownerPubkey) {
            //     throw new GoshError(EGoshError.DAO_EXISTS, { name })
            // }
            return dao
        }

        // If DAO is not active (deployed), deploy and wait for status `active`
        await this.run('deployDao', { name, previous: prevAddr || null })
        while (true) {
            const acc = await dao.account.getAccount()
            console.debug('[Create DAO]: Wait for account', acc)
            if (acc.acc_type === AccountType.active) break
            await sleep(5000)
        }
        return dao
    }

    async deployWallet(daoAddr: string, profileAddr: string): Promise<IGoshWallet> {
        // TODO: version
        const dao = new GoshDao(this.account.client, daoAddr, '')
        const address = await dao.getWalletAddr(profileAddr, 0)
        // TODO: version
        const wallet = new GoshWallet(this.account.client, address, '')
        const acc = await wallet.account.getAccount()
        if (acc.acc_type !== AccountType.active) {
            await this.run('deployWallet', { dao: daoAddr, pubaddr: profileAddr })
            while (true) {
                const acc = await wallet.account.getAccount()
                console.debug('[Deploy wallet]: Wait for account', acc)
                if (acc.acc_type === AccountType.active) break
                await sleep(5000)
            }
        }
        return wallet
    }

    async turnOn(walletAddr: string, pubkey: string): Promise<void> {
        await this.run('turnOn', { wallet: walletAddr, pubkey })
    }

    async isPubkeyCorrect(pubkey: string): Promise<boolean> {
        const result = await this.account.runLocal('isPubkeyCorrect', { pubkey })
        return result.decoded?.output.value0
    }
}

export { GoshProfile }
