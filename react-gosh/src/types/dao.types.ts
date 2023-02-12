import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter } from '../gosh/interfaces'
import { TAddress, TEventCreateParams } from './types'

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

type TDaoMemberCreateParams = TEventCreateParams & {
    usernames?: string[]
    members?: { username: string; allowance: number; comment: string }[]
}

type TDaoMemberDeleteParams = TEventCreateParams & {
    usernames: string[]
}

type TDaoMemberAllowanceUpdateParams = TEventCreateParams & {
    members: { profile: TAddress; increase: boolean; amount: number }[]
}

type TDaoUpgradeParams = TEventCreateParams & {
    version: string
    description?: string
}

type TDaoVotingTokenAddParams = TEventCreateParams & {
    username: string
    amount: number
    alone?: boolean
}

type TDaoRegularTokenAddParams = TEventCreateParams & {
    username: string
    amount: number
    alone?: boolean
}

type TDaoMintTokenParams = TEventCreateParams & {
    amount: number
    alone?: boolean
}

type TDaoMintDisableParams = TEventCreateParams & {
    alone?: boolean
}

type TDaoTagCreateParams = TEventCreateParams & {
    tags: string[]
    alone?: boolean
}

type TDaoTagDeleteParams = TEventCreateParams & {
    tags: string[]
}

export {
    TDao,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMember,
    TDaoMemberDetails,
    TDaoSupplyDetails,
    TWalletDetails,
    TDaoMemberCreateParams,
    TDaoMemberDeleteParams,
    TDaoMemberAllowanceUpdateParams,
    TDaoUpgradeParams,
    TDaoVotingTokenAddParams,
    TDaoRegularTokenAddParams,
    TDaoMintTokenParams,
    TDaoMintDisableParams,
    TDaoTagCreateParams,
    TDaoTagDeleteParams,
}
