import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter } from '../gosh/interfaces'
import { TAddress } from './types'

type TDao = {
    address: TAddress
    name: string
    version: string
    members: { profile: TAddress; wallet: TAddress }[]
    supply: number
    owner: TAddress
    isAuthOwner: boolean
    isAuthMember: boolean
    isAuthenticated: boolean
}

type TDaoListItem = Omit<
    TDao,
    'members' | 'supply' | 'owner' | 'isAuthOwner' | 'isAuthMember' | 'isAuthenticated'
> & {
    adapter: IGoshDaoAdapter
    members?: { profile: TAddress; wallet: TAddress }[]
    supply?: number
    owner?: TAddress
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
    profile: TAddress
    wallet: TAddress
    smvBalance: number
}

type TDaoMemberListItem = Omit<TDaoMemberDetails, 'smvBalance'> & {
    smvBalance?: number
    isLoadDetailsFired?: boolean
}

type TWalletDetails = {
    address: TAddress
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
