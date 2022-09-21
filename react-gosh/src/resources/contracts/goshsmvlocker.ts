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

/*     async getDetails(): Promise<any> {
        return {
            address: this.address,
            tokens: await this.getVotes(),
            isBusy: await this.getIsBusy(),
        }
    }
 */
    async getDetails(): Promise<any> {
        return {
            address: this.address,
            tokens: await this.getVotes(),
            isBusy: await this.getIsBusy(),
            numClients: await this.getNumClients(),
            goshBalance: await this.getNumClients(),
            goshLockerBalance: parseInt(await this.account.getBalance())/1e9,
        }
    }

    async getNumClients(): Promise<number> {
        const result = await this.account.runLocal('m_num_clients', {})
        return result.decoded?.output.m_num_clients
    }

    async getVotes(): Promise<{ total: number; locked: number }> {
        const total = await this.account.runLocal('m_tokenBalance', {})
        const locked = await this.account.runLocal('votes_locked', {})
        return {
            total: +total.decoded?.output.m_tokenBalance,
            locked: +locked.decoded?.output.votes_locked,
        }
    }

    async getIsBusy(): Promise<boolean> {
        const result = await this.account.runLocal('lockerBusy', {})
        return result.decoded?.output.lockerBusy
    }
}

export { GoshSmvLocker }
