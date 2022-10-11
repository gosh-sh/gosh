import { KeyPair, TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { GoshSmvLocker } from './goshsmvlocker'
import { IGoshProfile, IGoshSmvLocker, IGoshWallet } from '../interfaces'

class GoshWallet extends BaseContract implements IGoshWallet {
    static key: string = 'goshwallet'
    static version = '0.11.0'
    profile?: IGoshProfile

    constructor(
        client: TonClient,
        address: string,
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
        const locker = new GoshSmvLocker(this.account.client, addr)
        await locker.load()
        return locker
    }

    async getSmvLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tip3VotingLocker', {})
        return result.decoded?.output.tip3VotingLocker
    }

    async getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string> {
        const result = await this.account.runLocal('clientAddress', {
            _tip3VotingLocker: lockerAddr,
            propId: proposalId,
        })
        return result.decoded?.output.value0
    }

    async getSmvTokenBalance(): Promise<number> {
        const result = await this.account.runLocal('_tokenBalance', {})
        return +result.decoded?.output._tokenBalance
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

    async voteFor(
        platformCode: string,
        clientCode: string,
        proposalAddr: string,
        choice: boolean,
        amount: number,
    ): Promise<void> {
        await this.run('voteFor', {
            platformCode,
            clientCode,
            proposal: proposalAddr,
            choice,
            amount,
        })
    }

    /** For smv */
    async updateHead(): Promise<void> {
        await this.run('updateHead', {})
    }

    async deployContent(
        repoName: string,
        commitName: string,
        label: string,
        content: string,
    ): Promise<void> {
        await this.run('deployContent', {
            repoName,
            commit: commitName,
            label,
            content,
        })
    }

    async getContentAdress(
        repoName: string,
        commitName: string,
        label: string,
    ): Promise<string> {
        const result = await this.account.runLocal('getContentAdress', {
            repoName,
            commit: commitName,
            label,
        })
        return result.decoded?.output.value0
    }
}

export { GoshWallet }
