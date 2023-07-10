import { Repository } from '../blockchain/repository'

export type TRepositoryListItem = {
    account: Repository | null
    name: string
    version: string
    branches: TBranch[]
}

export type TRepositoryList = {
    isFetching: boolean
    items: TRepositoryListItem[]
    cursor?: string
    hasNext?: boolean
    error?: any
}

export type TBranch = {
    name: string
    commit: {
        address: string
        version: string
    }
}

export type TCommit = {
    repository: string
    branch: string
    name: string
    parents: string[]
    content: string
    initupgrade: boolean
}

export type TCommitTag = {
    reponame: string
    name: string
    content: string
    commit: {
        address: string
        name: string
    }
}
