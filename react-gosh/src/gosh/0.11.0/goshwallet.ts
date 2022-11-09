import { KeyPair, TonClient } from '@eversdk/core'
import { GoshSmvProposal } from './goshsmvproposal'
import { BaseContract } from '../base'
import { GoshSmvLocker } from './goshsmvlocker'
import { IGoshProfile, IGoshSmvLocker, IGoshWallet } from '../interfaces'
import { TAddress } from '../../types'

class GoshWallet extends BaseContract implements IGoshWallet {
    static key: string = 'goshwallet'
    static version = '0.11.0'
    profile?: IGoshProfile

    constructor(
        client: TonClient,
        address: TAddress,
        optional?: { keys?: KeyPair; profile?: IGoshProfile },
    ) {
        super(client, GoshWallet.key, address, {
            version: GoshWallet.version,
            keys: optional?.keys,
        })
        if (optional?.profile) this.profile = optional.profile
    }

    async getAccess(): Promise<string | null> {
        const result = await this.account.runLocal('getAccess', {})
        return result.decoded?.output.value0
    }

    async getSmvLocker(): Promise<IGoshSmvLocker> {
        const addr = await this.getSmvLockerAddr()
        return new GoshSmvLocker(this.account.client, addr)
    }

    async getSmvLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tip3VotingLocker', {})
        return result.decoded?.output.tip3VotingLocker
    }

    async getSmvClientAddr(lockerAddr: string, platform_id: string): Promise<string> {
        const result = await this.account.runLocal('clientAddressForProposal', {
            _tip3VotingLocker: lockerAddr,
            _platform_id: platform_id,
        })
        return result.decoded?.output.value0
    }

    async getSmvTokenBalance(): Promise<number> {
        const result = await this.account.runLocal('m_pseudoDAOBalance', {})
        return +result.decoded?.output.m_pseudoDAOBalance
    }

    async lockVoting(amount: number): Promise<void> {
        await this.run('lockVoting', { amount })
    }

    async unlockVoting(amount: number): Promise<void> {
        await this.run('unlockVoting', { amount })
    }

    async tryProposalResult(proposalAddr: string): Promise<void> {
        await this.run('tryProposalResult', { proposal: proposalAddr })
    }

    async voteFor(proposalAddr: string, choice: boolean, amount: number): Promise<void> {
        const proposal = new GoshSmvProposal(this.account.client, proposalAddr)
        const locker = new GoshSmvLocker(
            this.account.client,
            await this.getSmvLockerAddr(),
        )
        await this.run('voteFor', {
            platform_id: await proposal.getPlatformId(),
            choice,
            amount,
            num_clients: await locker.getNumClients(),
        })
    }

    /** For smv */
    async updateHead(): Promise<void> {
        await this.run('updateHead', {})
    }
}

export { GoshWallet }
