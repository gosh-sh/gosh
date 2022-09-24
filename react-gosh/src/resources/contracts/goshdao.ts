import { KeyPair, signerKeys, TonClient } from '@eversdk/core'
import { GoshError } from '../../errors'
import { TDaoDetails } from '../../types'
import { BaseContract } from './base'
import { GoshProfile } from './goshprofile'
import { GoshSmvTokenRoot } from './goshsmvtokenroot'
import { GoshWallet } from './goshwallet'
import { IGoshDao, IGoshWallet } from './interfaces'

class GoshDaoFactory {
    static key: string = 'goshdao'

    static create(client: TonClient, address: string, version: string): IGoshDao {
        switch (version) {
            case '0.11.0':
                return new GoshDao(client, address, version)
            default:
                throw new GoshError('GoshDao version is not implemented', { version })
        }
    }
}

class GoshDao extends BaseContract implements IGoshDao {
    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshDaoFactory.key, address, { version })
    }

    async getDetails(): Promise<TDaoDetails> {
        const smvTokenRootAddr = await this.getSmvRootTokenAddr()
        const smvTokenRoot = new GoshSmvTokenRoot(
            this.account.client,
            smvTokenRootAddr,
            this.version,
        )
        return {
            address: this.address,
            name: await this.getName(),
            version: this.version,
            members: await this.getProfiles(),
            supply: await smvTokenRoot.getTotalSupply(),
            owner: await this.getOwner(),
        }
    }

    async getWalletAddr(profileAddr: string, index: number): Promise<string> {
        const result = await this.account.runLocal('getAddrWallet', {
            pubaddr: profileAddr,
            index,
        })
        return result.decoded?.output.value0
    }

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

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameDao', {})
        return result.decoded?.output.value0
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
        const wallet = new GoshWallet(this.account.client, address, this.version, {
            keys,
            profile,
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

export { GoshDaoFactory }
