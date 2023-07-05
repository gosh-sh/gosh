import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { UserProfile } from '../../blockchain/userprofile'
import { TToastStatus } from '../../types/common.types'
import { Dao } from '../blockchain/dao'
import { SmvEvent } from '../blockchain/smvproposal'
import { Wallet } from '../blockchain/wallet'

export type TDaoListItem = {
    account: Dao | null
    name: string
    onboarding?: string[]
}

export type TUserDaoList = {
    isFetching: boolean
    error?: any
    items: TDaoListItem[]
    cursor?: string
    hasNext?: boolean
}

export type TDaoDetailsMemberItem = {
    profile: UserProfile
    wallet: Wallet
    allowance: number
}

export type TDaoDetails = {
    isFetching: boolean
    error?: any
    details: {
        account?: Dao
        _adapter?: IGoshDaoAdapter // TODO: Remove this after git part refactor
        name?: string
        address?: string
        version?: string
        members?: TDaoDetailsMemberItem[]
        supply?: {
            reserve: number
            voting: number
            total: number
        }
        owner?: string
    }
}

export type TDaoMember = {
    status?: TToastStatus
    details: {
        profile: UserProfile | null
        wallet: Wallet | null
        allowance: number | null
        balance: {
            total: number
            locked: number
            regular: number
        } | null
        isFetched: boolean
        isMember: boolean
        isReady: boolean
    }
}

export type TDaoMemberListItem = TDaoDetailsMemberItem & {
    isFetching: boolean
    username: string
}

export type TDaoMemberList = {
    isFetching: boolean
    error?: any
    items: TDaoMemberListItem[]
}

export type TDaoEventDetails = {
    account: SmvEvent | null
    address: string
    platformId: string
    type: number
    label: string
    status: {
        completed: boolean
        accepted: boolean
    }
    time: {
        start: number
        finish: number
        completed: number
    }
    votes: {
        yes: number
        no: number
        total: number
        yours: number
    }
    data?: any
    isOpen?: boolean
}

export type TDaoEventList = {
    isFetching: boolean
    items: TDaoEventDetails[]
    cursor?: string
    hasNext?: boolean
    error?: any
}
