import { TonClient } from '@eversdk/core'
import { getPaginatedAccounts } from '../../helpers'
import { TGoshBranch, TGoshRepoDetails } from '../../types'
import { BaseContract } from '../base'
import { Gosh } from './gosh'
import { GoshTag } from '../../resources'
import { IGosh, IGoshRepository } from '../interfaces'

class GoshRepository extends BaseContract implements IGoshRepository {
    static key: string = 'repository'
    static version = '0.11.0'
    meta?: IGoshRepository['meta']

    constructor(client: TonClient, address: string) {
        super(client, GoshRepository.key, address, { version: GoshRepository.version })
    }

    /** Old interface methods */
    async load(): Promise<void> {
        const branches = await this.getBranches()
        const tags = await this.getTags()

        this.meta = {
            name: await this.getName(),
            branchCount: branches.length,
            tags,
        }
    }

    async getDetails(): Promise<TGoshRepoDetails> {
        return {
            address: this.address,
            name: await this.getName(),
            branches: await this.getBranches(),
            head: await this.getHead(),
            tags: await this.getTags(),
        }
    }

    async getGosh(version: string): Promise<any> {
        const addr = await this.getGoshAddr()
        return new Gosh(this.account.client, addr)
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {})
        return result.decoded?.output.value0
    }

    async getBranches(): Promise<TGoshBranch[]> {
        const result = await this.account.runLocal('getAllAddress', {})
        const items = result.decoded?.output.value0
        return await Promise.all(
            items.map(async (item: any) => {
                return {
                    name: item.key,
                    commitAddr: item.value,
                    isProtected: await this.isBranchProtected(item.key),
                }
            }),
        )
    }

    async getBranch(name: string): Promise<TGoshBranch> {
        const result = await this.account.runLocal('getAddrBranch', { name })
        const decoded = result.decoded?.output.value0
        return {
            name: decoded.key,
            commitAddr: decoded.value,
            isProtected: await this.isBranchProtected(name),
        }
    }

    async getHead(): Promise<string> {
        const result = await this.account.runLocal('getHEAD', {})
        return result.decoded?.output.value0
    }

    async getCommitAddr(commitSha: string): Promise<string> {
        const result = await this.account.runLocal('getCommitAddr', {
            nameCommit: commitSha,
        })
        return result.decoded?.output.value0
    }

    async getBlobAddr(blobName: string): Promise<string> {
        const result = await this.account.runLocal('getBlobAddr', {
            nameBlob: blobName,
        })
        return result.decoded?.output.value0
    }

    async getTagCode(): Promise<string> {
        const result = await this.account.runLocal('getTagCode', {})
        return result.decoded?.output.value0
    }

    async getTags(): Promise<{ content: string; commit: string }[]> {
        // Get repo tag code and all tag accounts addresses
        const code = await this.getTagCode()
        const codeHash = await this.account.client.boc.get_boc_hash({ boc: code })
        const accounts: string[] = []
        let next: string | undefined
        while (true) {
            const { results, lastId, completed } = await getPaginatedAccounts({
                filters: [`code_hash: {eq:"${codeHash.hash}"}`],
                limit: 50,
                lastId: next,
            })
            accounts.push(...results.map((item) => item.id))
            next = lastId
            if (completed) break
        }

        // Read each tag account details
        // TODO: version
        return await Promise.all(
            accounts.map(async (address) => {
                const tag = new GoshTag(this.account.client, address, '')
                return await tag.getDetails()
            }),
        )
    }

    async getGoshAddr(): Promise<string> {
        const result = await this.account.runLocal('getGoshAdress', {})
        return result.decoded?.output.value0
    }

    async getSnapshotCode(branch: string): Promise<string> {
        const result = await this.account.runLocal('getSnapCode', { branch })
        return result.decoded?.output.value0
    }

    async getSnapshotAddr(branch: string, filename: string): Promise<string> {
        const result = await this.account.runLocal('getSnapshotAddr', {
            branch,
            name: filename,
        })
        return result.decoded?.output.value0
    }

    async getTreeAddr(treeName: string): Promise<string> {
        const result = await this.account.runLocal('getTreeAddr', {
            treeName,
        })
        return result.decoded?.output.value0
    }

    async getDiffAddr(
        commitName: string,
        index1: number,
        index2: number,
    ): Promise<string> {
        const result = await this.account.runLocal('getDiffAddr', {
            commitName,
            index1,
            index2,
        })
        return result.decoded?.output.value0
    }

    async isBranchProtected(branch: string): Promise<boolean> {
        const result = await this.account.runLocal('isBranchProtected', {
            branch,
        })
        return result.decoded?.output.value0
    }
}

export { GoshRepository }
