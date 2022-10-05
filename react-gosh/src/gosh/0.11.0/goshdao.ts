import { KeyPair, signerKeys, TonClient } from '@eversdk/core'
import { TDaoDetails } from '../../types'
import { BaseContract } from '../base'
import { GoshProfile } from '../goshprofile'
import { IGoshDao, IGoshWallet } from '../interfaces'
import { GoshSmvTokenRoot } from './goshsmvtokenroot'
import { GoshWallet } from './goshwallet'

class GoshDao extends BaseContract implements IGoshDao {
    static key: string = 'goshdao'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshDao.key, address, { version: GoshDao.version })
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameDao', {})
        return result.decoded?.output.value0
    }

    async getDetails(): Promise<TDaoDetails> {
        const smvTokenRootAddr = await this.getSmvRootTokenAddr()
        const smvTokenRoot = new GoshSmvTokenRoot(this.account.client, smvTokenRootAddr)
        return {
            address: this.address,
            name: await this.getName(),
            version: this.version,
            members: await this.getProfiles(),
            supply: await smvTokenRoot.getTotalSupply(),
            owner: await this.getOwner(),
        }
    }

    async getWalletAddr(profile: string, index: number): Promise<string> {
        const result = await this.account.runLocal('getAddrWallet', {
            pubaddr: profile,
            index,
        })
        return result.decoded?.output.value0
    }

    /** Old interface methods */
    async getWallets(): Promise<string[]> {
        const result = await this.account.runLocal('getWallets', {})
        return result.decoded?.output.value0
    }

    async getProfiles(): Promise<{ profile: string; wallet: string }[]> {
        const result = await this.account.runLocal('getWalletsFull', {})
        const profiles = []
        for (const key in result.decoded?.output.value0) {
            const profile = `0:${key.slice(2)}`
            profiles.push({ profile, wallet: result.decoded?.output.value0[key] })
        }
        return profiles
    }

    async getSmvRootTokenAddr(): Promise<string> {
        const result = await this.account.runLocal('_rootTokenRoot', {})
        return result.decoded?.output._rootTokenRoot
    }

    async getSmvProposalCode(): Promise<string> {
        const result = await this.account.runLocal('getProposalCode', {})
        return result.decoded?.output.value0
    }

    async getSmvClientCode(): Promise<string> {
        const result = await this.account.runLocal('getClientCode', {})
        return result.decoded?.output.value0
    }

    async getOwner(): Promise<string> {
        const result = await this.account.runLocal('getOwner', {})
        return result.decoded?.output.value0
    }

    async getOwnerWallet(keys?: KeyPair): Promise<IGoshWallet> {
        const profile = new GoshProfile(this.account.client, await this.getOwner(), keys)
        const address = await this.getWalletAddr(profile.address, 0)
        const wallet = new GoshWallet(this.account.client, address, {
            keys,
            // profile,
        })
        return wallet
    }

    async isMember(profileAddr: string): Promise<boolean> {
        const result = await this.account.runLocal('isMember', { pubaddr: profileAddr })
        return result.decoded?.output.value0
    }

    async mint(amount: number, recipient: string, daoOwnerKeys: KeyPair): Promise<void> {
        const tokenRoot = await this.getSmvRootTokenAddr()
        await this.run(
            'mint',
            {
                tokenRoot,
                amount,
                recipient,
                deployWalletValue: 0,
                remainingGasTo: this.address,
                notify: true,
                payload: '',
            },
            {
                signer: signerKeys(daoOwnerKeys),
            },
        )
    }
}

export { GoshDao }
