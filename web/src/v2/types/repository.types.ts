import { Repository } from '../blockchain/repository'

export type TRepositoryListItem = {
    account: Repository | null
    name: string
    version: string
    branches: TRepositoryBranch[]
}

export type TRepositoryList = {
    isFetching: boolean
    items: TRepositoryListItem[]
    cursor?: string
    hasNext?: boolean
    error?: any
}

export type TRepositoryBranch = {
    name: string
    commit: {
        address: string
        version: string
    }
}
