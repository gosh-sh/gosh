import { TonClient } from '@eversdk/core'
import { BaseContract } from '../base'
import { IGoshCommit, IGoshTree } from '../interfaces'
import { GoshTree } from './goshtree'

class GoshCommit extends BaseContract implements IGoshCommit {
    static key: string = 'commit'
    static version = '0.11.0'

    constructor(client: TonClient, address: string) {
        super(client, GoshCommit.key, address, { version: GoshCommit.version })
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameCommit', {})
        return result.decoded?.output.value0
    }

    async getCommit(): Promise<any> {
        const result = await this.account.runLocal('getCommit', {})
        return result.decoded?.output
    }

    async getParents(): Promise<string[]> {
        const result = await this.account.runLocal('getParents', {})
        return result.decoded?.output.value0
    }

    async getTree(): Promise<string> {
        const result = await this.account.runLocal('gettree', {})
        return result.decoded?.output.value0
    }

    async getDiffAddr(index1: number, index2: number): Promise<string> {
        const result = await this.account.runLocal('getDiffAdress', {
            index1,
            index2,
        })
        return result.decoded?.output.value0
    }
}

export { GoshCommit }
