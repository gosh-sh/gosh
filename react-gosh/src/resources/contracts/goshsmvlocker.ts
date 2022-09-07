import { TonClient } from '@eversdk/core'
import { BaseContract } from './base'
import { IGoshSmvLocker } from './interfaces'

class GoshSmvLocker extends BaseContract implements IGoshSmvLocker {
    static key: string = 'smvtokenlocker'
    meta?: IGoshSmvLocker['meta']

    constructor(client: TonClient, address: string, version: string) {
        super(client, GoshSmvLocker.key, address, { version })
    }

    async load(): Promise<void> {
        const votes = await this.getVotes()
        const isBusy = await this.getIsBusy()
        this.meta = {
            votesLocked: votes.locked,
            votesTotal: votes.total,
            isBusy,
        }
    }

    async getDetails(): Promise<any> {
        return {
            address: this.address,
            tokens: await this.getVotes(),
            isBusy: await this.getIsBusy(),
        }
    }

    async getVotes(): Promise<{ total: number; locked: number }> {
        const total = await this.account.runLocal('total_votes', {})
        const locked = await this.account.runLocal('votes_locked', {})
        return {
            total: +total.decoded?.output.total_votes,
            locked: +locked.decoded?.output.votes_locked,
        }
    }

    async getIsBusy(): Promise<boolean> {
        const result = await this.account.runLocal('lockerBusy', {})
        return result.decoded?.output.lockerBusy
    }
}

export { GoshSmvLocker }
