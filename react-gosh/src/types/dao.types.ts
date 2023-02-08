import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter } from '../gosh/interfaces'
import { TAddress } from './types'

type TDao = {
    address: TAddress
    name: string
    version: string
    members: TDaoMember[]
    supply: TDaoSupplyDetails
    owner: TAddress
    tags?: string[]
    isMintOn: boolean
    isAuthenticated: boolean
    isAuthOwner: boolean
    isAuthMember: boolean
    isAuthLimited?: boolean
}

type TDaoListItem = Omit<
    TDao,
    | 'members'
    | 'supply'
    | 'owner'
    | 'isMintOn'
    | 'isAuthOwner'
    | 'isAuthMember'
    | 'isAuthenticated'
> & {
    adapter: IGoshDaoAdapter
    members?: { profile: TAddress; wallet: TAddress }[]
    supply?: TDaoSupplyDetails
    owner?: TAddress
    isMintOn?: boolean
    isAuthOwner?: boolean
    isAuthMember?: boolean
    isAuthenticated?: boolean
    isLoadDetailsFired?: boolean
}

type TDaoSupplyDetails = {
    reserve: number
    voting: number
    total: number
}

type TDaoCreateProgress = {
    isFetching: boolean
    isDaoDeployed?: boolean
    isDaoAuthorized?: boolean
    isTokenSetup?: boolean
    isRepositoryDeployed?: boolean
    isTagsDeployed?: boolean
    isBlobsDeployed?: boolean
}

type TDaoMember = {
    profile: TAddress
    wallet: TAddress
    allowance?: number
}

type TDaoMemberDetails = TDaoMember & {
    name: string
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
    TDaoMember,
    TDaoMemberDetails,
    TDaoSupplyDetails,
    TWalletDetails,
}
