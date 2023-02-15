import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter } from '../gosh/interfaces'
import { TAddress, TEventCreateParams } from './types'

enum ETaskBounty {
    ASSING = 1,
    REVIEW = 2,
    MANAGER = 3,
}

type TDao = {
    address: TAddress
    name: string
    version: string
    members: TDaoMember[]
    supply: TDaoSupplyDetails
    owner: TAddress
    tags?: string[]
    isMintOn: boolean
    isEventProgressOn: boolean
    isEventDiscussionOn: boolean
    isAskMembershipOn: boolean
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
    | 'isEventProgressOn'
    | 'isEventDiscussionOn'
    | 'isAskMembershipOn'
    | 'isAuthOwner'
    | 'isAuthMember'
    | 'isAuthenticated'
> & {
    adapter: IGoshDaoAdapter
    members?: { profile: TAddress; wallet: TAddress }[]
    supply?: TDaoSupplyDetails
    owner?: TAddress
    isMintOn?: boolean
    isEventProgressOn?: boolean
    isEventDiscussionOn?: boolean
    isAskMembershipOn?: boolean
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

type TTaskDetails = {
    address: TAddress
    name: string
    repository: string
    candidates: any[]
    config: any
    confirmed: boolean
    confirmedAt: number
    tags: string[]
}

type TTaskListItem = TTaskDetails & {
    adapter: IGoshDaoAdapter
    isLoadDetailsFired?: boolean
}

type TTaskCreateParams = TEventCreateParams & {
    repository: string
    name: string
    config: {
        assign: { grant: number; lock: number }[]
        review: { grant: number; lock: number }[]
        manager: { grant: number; lock: number }[]
    }
    tags?: string[]
}

type TTaskDeleteParams = TEventCreateParams & {
    repository: string
    name: string
}

type TTaskReceiveBountyParams = {
    repository: string
    name: string
    type: ETaskBounty
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

type TDaoAskMembershipAllowanceParams = TEventCreateParams & {
    decision: boolean
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

type TDaoEventShowProgressParams = TEventCreateParams & {
    show: boolean
}

type TDaoEventAllowDiscussionParams = TEventCreateParams & {
    allow: boolean
}

type TDaoEventSendReviewParams = {
    event: TAddress
    decision: boolean
}

export {
    ETaskBounty,
    TDao,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMember,
    TDaoMemberDetails,
    TDaoSupplyDetails,
    TWalletDetails,
    TTaskDetails,
    TTaskListItem,
    TTaskCreateParams,
    TTaskDeleteParams,
    TTaskReceiveBountyParams,
    TDaoMemberCreateParams,
    TDaoMemberDeleteParams,
    TDaoMemberAllowanceUpdateParams,
    TDaoAskMembershipAllowanceParams,
    TDaoUpgradeParams,
    TDaoVotingTokenAddParams,
    TDaoRegularTokenAddParams,
    TDaoMintTokenParams,
    TDaoMintDisableParams,
    TDaoTagCreateParams,
    TDaoTagDeleteParams,
    TDaoEventShowProgressParams,
    TDaoEventAllowDiscussionParams,
    TDaoEventSendReviewParams,
}
