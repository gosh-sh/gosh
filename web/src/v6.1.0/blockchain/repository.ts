import { TonClient } from '@eversdk/core'
import { BaseContract } from '../../blockchain/contract'
import { GoshError } from '../../errors'
import { TGoshBranch } from '../types/repository.types'
import RepositoryABI from './abi/repository.abi.json'
import { GoshCommit } from './commit'
import { GoshCommitTag } from './committag'
import { GoshShapshot } from './snapshot'
import { GoshTree } from './tree'

export class GoshRepository extends BaseContract {
    constructor(client: TonClient, address: string) {
        super(client, RepositoryABI, address)
    }

    async isBranchProtected(name: string) {
        const { value0 } = await this.runLocal('isBranchProtected', { branch: name })
        return value0 as boolean
    }

    async getName(): Promise<string> {
        const { value0 } = await this.runLocal('getName', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    async getDetails() {
        const data = await this.runLocal('getDetails', {})
        return {
            name: data.name,
            branches: await this.getBranches(data.alladress),
            description: data.description,
            head: data.head,
            tags: Object.values(data.hashtag) as string[],
            isReady: data.ready,
        }
    }

    async getBranches(parse?: any): Promise<TGoshBranch[]> {
        if (!parse) {
            const { value0 } = await this.runLocal('getAllAddress', {})
            parse = value0
        }

        return await Promise.all(
            parse.map(async (item: any) => ({
                name: item.branchname,
                commit: {
                    address: item.commitaddr,
                    version: item.commitversion,
                },
                protected: await this.isBranchProtected(item.branchname),
            })),
        )
    }

    async getBranch(name: string): Promise<TGoshBranch> {
        const { value0 } = await this.runLocal('getAddrBranch', { name })
        return {
            name: value0.branchname,
            commit: {
                address: value0.commitaddr,
                version: value0.commitversion,
            },
            protected: await this.isBranchProtected(name),
        }
    }

    async getCommitTagCodeHash() {
        const code = await this.runLocal('getTagCode', {}, undefined, {
            useCachedBoc: true,
        })
        const { hash } = await this.client.boc.get_boc_hash({ boc: code.value0 })
        return hash
    }

    async getCommitTag(params: { address: string }) {
        const { address } = params
        return new GoshCommitTag(this.client, address)
    }

    async getCommit(params: { name?: string; address?: string }) {
        const { name, address } = params

        let _address = address
        if (!_address) {
            if (!name) {
                throw new GoshError('Value error', 'Commit name undefined')
            }

            const { value0 } = await this.runLocal(
                'getCommitAddr',
                { nameCommit: name },
                undefined,
                { useCachedBoc: true },
            )
            _address = value0
        }

        return new GoshCommit(this.client, _address!)
    }

    async getTree(params: { name?: string; address?: string }) {
        const { name, address } = params

        if (!name && !address) {
            throw new GoshError('Value error', 'Incorrect tree name or address')
        }

        if (address) {
            return new GoshTree(this.client, address)
        }

        const { value0 } = await this.runLocal(
            'getTreeAddr',
            { shainnertree: name },
            undefined,
            { useCachedBoc: true },
        )
        return new GoshTree(this.client, value0)
    }

    async getSnapshot(params: {
        address?: string
        data?: { commitname: string; filename: string; branch?: string }
    }) {
        const { address, data } = params

        if (!address && !data) {
            throw new GoshError('Value error', 'Data or address not passed')
        }

        let _address = address
        if (!_address) {
            const { commitname, filename } = data!
            const { value0 } = await this.runLocal(
                'getSnapshotAddr',
                { commitsha: commitname, name: filename },
                undefined,
                { useCachedBoc: true },
            )
            _address = value0
        }

        return new GoshShapshot(this.client, _address!)
    }
}
