import { TonClient } from '@eversdk/core'
import { TGoshCommitContent, TGoshCommitDetails } from '../../types'
import { BaseContract } from '../base'
import { IGoshCommit } from '../interfaces'

class GoshCommit extends BaseContract implements IGoshCommit {
    static key: string = 'commit'
    static version = '0.11.0'
    meta?: IGoshCommit['meta']

    constructor(client: TonClient, address: string) {
        super(client, GoshCommit.key, address, { version: GoshCommit.version })
    }

    async load(): Promise<void> {
        const meta = await this.getCommit()
        this.meta = {
            repoAddr: meta.repo,
            branchName: meta.branch,
            sha: meta.sha,
            content: GoshCommit.parseContent(meta.content),
            parents: meta.parents,
        }
    }

    async getDetails(): Promise<TGoshCommitDetails> {
        const meta = await this.getCommit()
        const commitData = {
            address: this.address,
            repoAddress: meta.repo,
            branch: meta.branch,
            name: meta.sha,
            content: meta.content,
            parents: meta.parents,
        }

        return {
            ...commitData,
            content: GoshCommit.parseContent(commitData.content),
        }
    }

    async getCommit(): Promise<any> {
        const result = await this.account.runLocal('getCommit', {})
        return result.decoded?.output
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameCommit', {})
        return result.decoded?.output.value0
    }

    async getParents(): Promise<string[]> {
        const result = await this.account.runLocal('getParents', {})
        return result.decoded?.output.value0
    }

    async getBlobs(): Promise<string[]> {
        const result = await this.account.runLocal('getBlobs', {})
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

    static parseContent(content: string): TGoshCommitContent {
        const splitted = content.split('\n')

        const commentIndex = splitted.findIndex((v) => v === '')
        const commentData = splitted.slice(commentIndex + 1)
        const [title, ...message] = commentData
        const parsed: { [key: string]: string } = {
            title,
            message: message.filter((v) => v).join('\n'),
        }

        const commitData = splitted.slice(0, commentIndex)
        commitData.forEach((item) => {
            ;['tree', 'author', 'committer'].forEach((key) => {
                if (item.search(key) >= 0) parsed[key] = item.replace(`${key} `, '')
            })
        })
        return parsed as TGoshCommitContent
    }
}

export { GoshCommit }
