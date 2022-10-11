import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter } from '../gosh/interfaces'

type TDao = {
    address: string
    name: string
    version: string
    members: { profile: string; wallet: string }[]
    supply: number
    owner: string
    isAuthOwner: boolean
    isAuthMember: boolean
    isAuthenticated: boolean
}

type TDaoListItem = Omit<
    TDao,
    'members' | 'supply' | 'owner' | 'isAuthOwner' | 'isAuthMember' | 'isAuthenticated'
> & {
    adapter: IGoshDaoAdapter
    members?: { profile: string; wallet: string }[]
    supply?: number
    owner?: string
    isAuthOwner?: boolean
    isAuthMember?: boolean
    isAuthenticated?: boolean
    isLoadDetailsFired?: boolean
}

type TDaoCreateProgress = {
    isFetching: boolean
    isDaoDeployed?: boolean
}

type TDaoMemberDetails = {
    name: string
    profile: string
    wallet: string
    smvBalance: number
}

type TDaoMemberListItem = Omit<TDaoMemberDetails, 'smvBalance'> & {
    smvBalance?: number
    isLoadDetailsFired?: boolean
}

type TWalletDetails = {
    address: string
    version: string
    keys?: KeyPair
    daoAddress: string
    isDaoMember: boolean
    isDaoOwner: boolean
}

export {
    TDao,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMemberDetails,
    TDaoMemberListItem,
    TWalletDetails,
}
