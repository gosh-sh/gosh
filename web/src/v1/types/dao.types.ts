import { TDao } from '../../types/blockchain.types'

export type TDaoListItem = {
    account: TDao | null
    name: string
    description: string | null
    tags: string[] | null
    onboarding?: string[]
}

export type TUserDaoList = {
    isFetching: boolean
    items: TDaoListItem[]
    cursor?: string
    hasNext?: boolean
}

export type TDaoDetailsState = {
    isFetching: boolean
    details: {
        account?: TDao
        name?: string
    }
    message?: { type: 'error' | 'pending'; data: any }
}
