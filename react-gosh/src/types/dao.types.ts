import { KeyPair } from '@eversdk/core'
import { IGoshDaoAdapter, IGoshTask, IGoshTopic } from '../gosh/interfaces'
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
    isRepoUpgraded: boolean
    isTaskRedeployed: boolean
    isMemberOf: { dao: TAddress; wallet: TAddress }[]
    hasRepoIndex: boolean
    isMintOnPrevDiff?: boolean
    isUpgraded: boolean
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
    | 'isRepoUpgraded'
    | 'isTaskRedeployed'
    | 'isMemberOf'
    | 'hasRepoIndex'
    | 'isUpgraded'
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
    isRepoUpgraded?: boolean
    isTaskRedeployed?: boolean
    isMemberOf?: { dao: TAddress; wallet: TAddress }[]
    hasRepoIndex?: boolean
    isUpgraded?: boolean
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
    expired?: number
}

type TDaoMemberDetails = TDaoMember & {
    user: TUserParam
    balance?: number
    balancePrev?: number
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
    account: IGoshTask
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
    tagsRaw: string[]
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
    type?: ETaskBounty
}

type TTaskTransferParams = {
    accountData: any
    repoName: string
}

type TTaskTransferResult = string

type TTaskUpgradeParams = TEventCreateParams & {
    repoName: string
    taskName: string
    taskPrev: { address: TAddress; version: string }
    tag: string[]
    cell?: boolean
}

type TTaskUpgradeResult = string | void

type TTaskUpgradeCompleteParams = {
    cell?: boolean
}

type TTaskUpgradeCompleteResult = void

type TUserParam = {
    name: string
    type: 'user' | 'dao' | string
}

type TDaoMemberCreateParams = TEventCreateParams & {
    usernames?: string[]
    members?: {
        user: TUserParam
        allowance: number
        comment: string
        expired: number
    }[]
    cell?: boolean
}

type TDaoMemberCreateResult = Promise<void | string>

type TDaoMemberDeleteParams = TEventCreateParams & {
    user: TUserParam[]
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
    user: TUserParam
    amount: number
    alone?: boolean
    cell?: boolean
}

type TDaoVotingTokenAddResult = Promise<void | string>

type TDaoRegularTokenAddParams = TEventCreateParams & {
    user: TUserParam
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

type TDaoTokenDaoSendParams = TEventCreateParams & {
    wallet: TAddress
    amount: number
    profile?: TAddress
    cell?: boolean
}

type TDaoVoteParams = TEventCreateParams & {
    wallet: TAddress
    platformId: string
    choice: boolean
    amount: number
    cell?: boolean
}

type TDaoVoteResult = string | void

type TDaoReviewParams = TEventCreateParams & {
    wallet: TAddress
    eventAddress: TAddress
    choice: boolean
    cell?: boolean
}

type TDaoReviewResult = string | void

type TTaskReceiveBountyDaoParams = TEventCreateParams & {
    wallet: TAddress
    repoName: string
    taskName: string
    cell?: boolean
}

type TTaskReceiveBountyDaoResult = string | void

type TDaoTokenDaoLockParams = TEventCreateParams & {
    wallet: TAddress
    isLock: boolean
    amount: number
    cell?: boolean
}

type TDaoTokenDaoTransferParams = TEventCreateParams & {
    walletPrev: TAddress
    walletCurr: TAddress
    amount: number
    versionPrev: string
    cell?: boolean
}

type TDaoTokenDaoTransferResult = string | void

type TDaoTokenDaoLockResult = string | void

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
    user?: TUserParam
    profile?: TAddress
}

type TIsMemberResult = Promise<boolean>

type TUpgradeVersionControllerParams = TEventCreateParams & {
    code: string
    cell: string
}

type TUpgradeVersionControllerResult = void

type TDaoStartPaidMembershipParams = TEventCreateParams & {
    value: number
    valuepersubs: number
    timeforsubs: number
    keyforservice: string
    cell?: boolean
}

type TDaoStartPaidMembershipResult = string | void

type TDaoStopPaidMembershipParams = TEventCreateParams & {
    cell?: boolean
}

type TDaoStopPaidMembershipResult = string | void

export {
    ETaskBounty,
    TDao,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMember,
    TDaoMemberDetails,
    TDaoSupplyDetails,
    TWalletDetails,
    TUserParam,
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
    TDaoTokenDaoSendParams,
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
    TTaskTransferParams,
    TTaskTransferResult,
    TTaskUpgradeCompleteParams,
    TTaskUpgradeCompleteResult,
    TDaoVoteParams,
    TDaoVoteResult,
    TDaoReviewParams,
    TDaoReviewResult,
    TTaskReceiveBountyDaoParams,
    TTaskReceiveBountyDaoResult,
    TDaoTokenDaoLockParams,
    TDaoTokenDaoLockResult,
    TTaskUpgradeParams,
    TTaskUpgradeResult,
    TDaoTokenDaoTransferParams,
    TDaoTokenDaoTransferResult,
    TUpgradeVersionControllerParams,
    TUpgradeVersionControllerResult,
    TDaoStartPaidMembershipParams,
    TDaoStartPaidMembershipResult,
    TDaoStopPaidMembershipParams,
    TDaoStopPaidMembershipResult,
}
