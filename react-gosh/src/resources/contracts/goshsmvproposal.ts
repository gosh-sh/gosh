import { TonClient } from '@eversdk/core'
import { TGoshEventDetails } from '../../types'
import { BaseContract } from './base'
import { IGoshSmvProposal } from './interfaces'

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

    async getDetails(): Promise<TGoshEventDetails> {
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

    async getTime(): Promise<{ start: Date; finish: Date }> {
        const start = await this.account.runLocal('startTime', {})
        const finish = await this.account.runLocal('finishTime', {})
        return {
            start: new Date(+start.decoded?.output.startTime * 1000),
            finish: new Date(+finish.decoded?.output.finishTime * 1000),
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
