import { TonClient } from '@eversdk/core'
import { TGoshEventDetails } from '../../types'
import { BaseContract } from './base'
import { IGoshSmvProposal } from './interfaces'
import { GoshError, EGoshError } from '../../errors'
import { GoshWallet } from './goshwallet'
import { GoshSmvClient } from './goshsmvclient'

class GoshSmvProposal extends BaseContract implements IGoshSmvProposal {
    static key: string = 'smvproposal'
    meta?: IGoshSmvProposal['meta']

    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshSmvProposal.key, address, { version })
    }

    async load(): Promise<void> {
        const id = await this.getId()
        const params = await this.getGoshSetCommitProposalParams()
        const votes = await this.getVotes()
        const time = await this.getTime()
        const isCompleted = await this.isCompleted()
        this.meta = {
            id,
            votes,
            time,
            isCompleted,
            commit: {
                kind: params.proposalKind,
                repoName: params.repoName,
                branchName: params.branchName,
                commitName: params.commit,
            },
        }
    }

/*     async getDetails(): Promise<TGoshEventDetails> {
        const isCompleted = await this.isCompleted()

        return {
            address: this.address,
            id: await this.getId(),
            params: await this.getParams(),
            time: await this.getTime(),
            votes: await this.getVotes(),
            status: {
                completed: isCompleted !== null,
                accepted: !!isCompleted,
            },
        }
    }
 */
    async getDetails(walletAddress?: string): Promise<TGoshEventDetails> {
        const isCompleted = await this.isCompleted()

        return {
            address: this.address,
            id: await this.getId(),
            params: await this.getParams(),
            time: await this.getTime(),
            votes: await this.getVotes(),
            status: {
                completed: isCompleted !== null,
                accepted: !!isCompleted,
            },
            total_votes : await this.getTotalSupply(),
            client_address: await this.getClientAddress(walletAddress),
            your_votes : await this.getYourVotes(walletAddress),
        }
    }



    async getParams(): Promise<any> {
        try {
            return await this.getGoshSetCommitProposalParams()
        } catch {}
        try {
            return await this.getGoshAddProtectedBranchProposalParams()
        } catch {}
        try {
            return await this.getGoshDeleteProtectedBranchProposalParams()
        } catch {}
        return null
    }

    async getId(): Promise<string> {
        const result = await this.account.runLocal('propId', {})
        return result.decoded?.output.propId
    }

    async getTotalSupply(): Promise<number> {
        const result = await this.account.runLocal('totalSupply', {})
        return result.decoded?.output.totalSupply
    }

    async getClientAddress(walletAddress?: string): Promise<string> {
        try {
            if (!walletAddress) throw new GoshError(EGoshError.NO_WALLET)

            const wallet = new GoshWallet(this.account.client, walletAddress!, this.version)
            const lockerAddress = (await wallet.account.runLocal('tip3VotingLocker', {})).decoded?.output.tip3VotingLocker
            const platform_id = (await this.account.runLocal('platform_id', {})).decoded?.output.platform_id
            const clientAddress = (await wallet.account.runLocal('clientAddressForProposal', {_tip3VotingLocker: lockerAddress, _platform_id: platform_id})).decoded?.output.value0
           //const result = new GoshSmvClient(this.account.client, clientAddress)
            /* return 7 */
            //const result = await client.account.runLocal('amount_locked', {})
            //return parseInt(result.decoded?.output.value0) 
            return clientAddress
        } catch (e: any) {
            console.error(e.message)
        }
        return "error"
    }

    async getYourVotes(walletAddress?: string): Promise<number> {
        try {
            if (!walletAddress) throw new GoshError(EGoshError.NO_WALLET)

            const wallet = new GoshWallet(this.account.client, walletAddress!, this.version)
            const lockerAddress = (await wallet.account.runLocal('tip3VotingLocker', {})).decoded?.output.tip3VotingLocker
            const platform_id = (await this.account.runLocal('platform_id', {})).decoded?.output.platform_id
            const clientAddress = (await wallet.account.runLocal('clientAddressForProposal', {_tip3VotingLocker: lockerAddress, _platform_id: platform_id})).decoded?.output.value0
            const client = new GoshSmvClient(this.account.client, clientAddress, this.version)
            /* return 7 */
            const result = await client.account.runLocal('amount_locked', {})
            return parseInt(result.decoded?.output.value0) 
        } catch (e: any) {
            console.error(e.message)
        }
        return 0
    }


    async getPlatformId(): Promise<number> {
        const result = await this.account.runLocal('platform_id', {})
        return result.decoded?.output.platform_id
    }


    async getGoshSetCommitProposalParams(): Promise<any> {
        const result = await this.account.runLocal('getGoshSetCommitProposalParams', {})
        const decoded = result.decoded?.output
        return {
            ...decoded,
            proposalKind: parseInt(decoded.proposalKind),
        }
    }

    async getGoshAddProtectedBranchProposalParams(): Promise<any> {
        const result = await this.account.runLocal(
            'getGoshAddProtectedBranchProposalParams',
            {},
        )
        const decoded = result.decoded?.output
        return {
            ...decoded,
            proposalKind: parseInt(decoded.proposalKind),
        }
    }

    async getGoshDeleteProtectedBranchProposalParams(): Promise<any> {
        const result = await this.account.runLocal(
            'getGoshDeleteProtectedBranchProposalParams',
            {},
        )
        const decoded = result.decoded?.output
        return {
            ...decoded,
            proposalKind: parseInt(decoded.proposalKind),
        }
    }

    async getVotes(): Promise<{ yes: number; no: number }> {
        const yes = await this.account.runLocal('votesYes', {})
        const no = await this.account.runLocal('votesNo', {})
        return {
            yes: +yes.decoded?.output.votesYes,
            no: +no.decoded?.output.votesNo,
        }
    }

/*     async getTime(): Promise<{ start: Date; finish: Date }> {
        const start = await this.account.runLocal('startTime', {})
        const finish = await this.account.runLocal('finishTime', {})
        return {
            start: new Date(+start.decoded?.output.startTime * 1000),
            finish: new Date(+finish.decoded?.output.finishTime * 1000),
        }
    }
 */
    async getTime(): Promise<{ start: Date; finish: Date; realFinish: Date; }> {
        const start = await this.account.runLocal('startTime', {})
        const finish = await this.account.runLocal('finishTime', {})
        const realFinish = await this.account.runLocal('realFinishTime', {})
        return {
            start: new Date(+start.decoded?.output.startTime * 1000),
            finish: new Date(+finish.decoded?.output.finishTime * 1000),
            realFinish: new Date(+realFinish.decoded?.output.realFinishTime * 1000),
        }
    }


    async isCompleted(): Promise<boolean | null> {
        const result = await this.account.runLocal('_isCompleted', {})
        return result.decoded?.output.value0
    }

    async getLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tokenLocker', {})
        return result.decoded?.output.tokenLocker
    }
}

export { GoshSmvProposal }
