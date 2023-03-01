import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter, IGoshTopic } from '../gosh/interfaces'
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
    isRepoUpgraded?: boolean
    hasRepoIndex: boolean
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
    | 'hasRepoIndex'
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
    hasRepoIndex?: boolean
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
    team?: {
        commit: {
            branch: string
            name: string
        }
        assigners: { username: string; address: string }[]
        reviewers: { username: string; address: string }[]
        managers: { username: string; address: string }[]
    }
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
    cell?: boolean
}

type TTaskCreateResult = Promise<void | string>

type TTaskDeleteParams = TEventCreateParams & {
    repository: string
    name: string
    cell?: boolean
}

type TTaskDeleteResult = Promise<void | string>

type TTaskReceiveBountyParams = {
    repository: string
    name: string
    type: ETaskBounty
}

type TDaoMemberCreateParams = TEventCreateParams & {
    usernames?: string[]
    members?: { username: string; allowance: number; comment: string }[]
    cell?: boolean
}

type TDaoMemberCreateResult = Promise<void | string>

type TDaoMemberDeleteParams = TEventCreateParams & {
    usernames: string[]
    cell?: boolean
}

type TDaoMemberDeleteResult = Promise<void | string>

type TDaoMemberAllowanceUpdateParams = TEventCreateParams & {
    members: { profile: TAddress; increase: boolean; amount: number }[]
    cell?: boolean
}

type TDaoMemberAllowanceUpdateResult = Promise<void | string>

type TDaoAskMembershipAllowanceParams = TEventCreateParams & {
    decision: boolean
    cell?: boolean
}

type TDaoAskMembershipAllowanceResult = Promise<void | string>

type TDaoUpgradeParams = TEventCreateParams & {
    version: string
    description?: string
    cell?: boolean
}

type TDaoUpgradeResult = Promise<void | string>

type TDaoVotingTokenAddParams = TEventCreateParams & {
    username: string
    amount: number
    alone?: boolean
    cell?: boolean
}

type TDaoVotingTokenAddResult = Promise<void | string>

type TDaoRegularTokenAddParams = TEventCreateParams & {
    username: string
    amount: number
    alone?: boolean
    cell?: boolean
}

type TDaoRegularTokenAddResult = Promise<void | string>

type TDaoMintTokenParams = TEventCreateParams & {
    amount: number
    alone?: boolean
    cell?: boolean
}

type TDaoMintTokenResult = Promise<void | string>

type TDaoMintDisableParams = TEventCreateParams & {
    alone?: boolean
    cell?: boolean
}

type TDaoMintDisableResult = Promise<void | string>

type TDaoTagCreateParams = TEventCreateParams & {
    tags: string[]
    alone?: boolean
    cell?: boolean
}

type TDaoTagCreateResult = Promise<void | string>

type TDaoTagDeleteParams = TEventCreateParams & {
    tags: string[]
    cell?: boolean
}

type TDaoTagDeleteResult = Promise<void | string>

type TDaoEventShowProgressParams = TEventCreateParams & {
    decision: boolean
    cell?: boolean
}

type TDaoEventShowProgressResult = Promise<void | string>

type TDaoEventAllowDiscussionParams = TEventCreateParams & {
    allow: boolean
    cell?: boolean
}

type TDaoEventAllowDiscussionResult = Promise<void | string>

type TDaoEventSendReviewParams = {
    event: TAddress
    decision: boolean
}

type TTopic = {
    account: IGoshTopic
    name: string
    content: string
    object: TAddress
}

type TTopicCreateParams = {
    name: string
    content: string
    object: TAddress
}

type TTopicMessageCreateParams = {
    topic: TAddress
    message: string
    answerId?: string
}

type TIsMemberParams = {
    username?: string
    profile?: TAddress
}

type TIsMemberResult = Promise<boolean>

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
    TTaskCreateResult,
    TTaskDeleteParams,
    TTaskDeleteResult,
    TTaskReceiveBountyParams,
    TDaoMemberCreateParams,
    TDaoMemberCreateResult,
    TDaoMemberDeleteParams,
    TDaoMemberDeleteResult,
    TDaoMemberAllowanceUpdateParams,
    TDaoMemberAllowanceUpdateResult,
    TDaoAskMembershipAllowanceParams,
    TDaoAskMembershipAllowanceResult,
    TDaoUpgradeParams,
    TDaoUpgradeResult,
    TDaoVotingTokenAddParams,
    TDaoVotingTokenAddResult,
    TDaoRegularTokenAddParams,
    TDaoRegularTokenAddResult,
    TDaoMintTokenParams,
    TDaoMintTokenResult,
    TDaoMintDisableParams,
    TDaoMintDisableResult,
    TDaoTagCreateParams,
    TDaoTagCreateResult,
    TDaoTagDeleteParams,
    TDaoTagDeleteResult,
    TDaoEventShowProgressParams,
    TDaoEventShowProgressResult,
    TDaoEventAllowDiscussionParams,
    TDaoEventAllowDiscussionResult,
    TDaoEventSendReviewParams,
    TTopic,
    TTopicCreateParams,
    TTopicMessageCreateParams,
    TIsMemberParams,
    TIsMemberResult,
}
