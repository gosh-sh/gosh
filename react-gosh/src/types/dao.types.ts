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
    expert_tags?: { name: string; multiplier: number }[]
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
        commit?: {
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

type TBigTaskDetails = TTaskDetails

type TTaskListItem = TTaskDetails & {
    adapter: IGoshDaoAdapter
    isLoadDetailsFired?: boolean
}

type TTaskGrant = {
    assign: { grant: number; lock: number }[]
    review: { grant: number; lock: number }[]
    manager: { grant: number; lock: number }[]
    subtask: { grant: number; lock: number }[]
}

type TTaskAssigner = {
    pubaddrassign: { [address: string]: boolean }
    pubaddrreview: { [address: string]: boolean }
    pubaddrmanager: { [address: string]: boolean }
    daoMembers: { [address: string]: string }
}

type TTaskCandidate = TTaskAssigner & {
    commitAddress?: string
    commitCount?: string
}

type TBigTaskCreateParams = TEventCreateParams & {
    repositoryName: string
    name: string
    config: TTaskGrant
    assigners: TTaskAssigner
    balance: number
    tags?: string[]
    cell?: boolean
}

type TBigTaskCreateResult = Promise<void | string>

type TBigTaskApproveParams = TEventCreateParams & {
    repositoryName: string
    name: string
    cell?: boolean
}

type TBigTaskApproveResult = void | string

type TBigTaskDeleteParams = TEventCreateParams & {
    repositoryName: string
    name: string
    cell?: boolean
}

type TBigTaskDeleteResult = void | string

type TBigTaskUpgradeParams = TEventCreateParams & {
    repositoryName: string
    name: string
    prevVersion: string
    prevAddress: string
    tags?: string[]
    cell?: boolean
}

type TBigTaskUpgradeResult = void | string

type TSubTaskDeleteParams = {
    repositoryName: string
    bigtaskName: string
    index: number
}

type TSubTaskDeleteResult = void

type TSubTaskCreateParams = {
    repositoryName: string
    bigtaskName: string
    name: string
    config: TTaskGrant
    balance: number
    tags?: string[]
    candidates?: TTaskCandidate
}

type TSubTaskCreateResult = void

type TTaskCreateParams = TEventCreateParams & {
    repository: string
    name: string
    config: TTaskGrant
    tags?: string[]
    candidates?: TTaskCandidate
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
    alone?: boolean
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
    index: number
    cost: { value: number; decimals: number }
    reserve: number
    subscriptionAmount: number
    subscriptionTime: number
    accessKey: string
    details: string
    cell?: boolean
}

type TDaoStartPaidMembershipResult = string | void

type TDaoStopPaidMembershipParams = TEventCreateParams & {
    index: number
    cell?: boolean
}

type TDaoStopPaidMembershipResult = string | void

type TCodeCommentThreadCreateParams = {
    name: string
    content: string
    object: string
    metadata: {
        startLine: number
        endLine: number
        commit: string
        snapshot: string
    }
    commit: string
    filename: string
}

type TCodeCommentThreadCreateResult = IGoshTopic

type TCodeCommentThreadGetCodeParams = {
    daoAddress: string
    objectAddress: string
    commitName: string
    filename: string
}

type TCodeCommentThreadGetCodeResult = string

type TCodeCommentThreadGetParams = {
    address: string
}

type TCodeCommentThreadGetResult = {
    account: IGoshTopic
    address: string
    name: string
    content: string
    metadata: TCodeCommentThreadCreateParams['metadata']
    isResolved: boolean
    createdBy: string
    createdAt: number
}

type TCodeCommentThreadResdolveParams = {
    address: string
    resolved: boolean
}

type TCodeCommentThreadResolveResult = void

type TCodeCommentCreateParams = {
    threadAddress: TAddress
    message: string
    answerId?: string
}

type TCodeCommentCreateResult = any

type TCreateIndexParams = {
    data: string
    index: number
    typetr: number
}

export {
    ETaskBounty,
    TBigTaskApproveParams,
    TBigTaskApproveResult,
    TBigTaskCreateParams,
    TBigTaskCreateResult,
    TBigTaskDeleteParams,
    TBigTaskDeleteResult,
    TBigTaskDetails,
    TBigTaskUpgradeParams,
    TBigTaskUpgradeResult,
    TCodeCommentCreateParams,
    TCodeCommentCreateResult,
    TCodeCommentThreadCreateParams,
    TCodeCommentThreadCreateResult,
    TCodeCommentThreadGetCodeParams,
    TCodeCommentThreadGetCodeResult,
    TCodeCommentThreadGetParams,
    TCodeCommentThreadGetResult,
    TCodeCommentThreadResdolveParams,
    TCodeCommentThreadResolveResult,
    TCreateIndexParams,
    TDao,
    TDaoAskMembershipAllowanceParams,
    TDaoAskMembershipAllowanceResult,
    TDaoCreateProgress,
    TDaoEventAllowDiscussionParams,
    TDaoEventAllowDiscussionResult,
    TDaoEventSendReviewParams,
    TDaoEventShowProgressParams,
    TDaoEventShowProgressResult,
    TDaoListItem,
    TDaoMember,
    TDaoMemberAllowanceUpdateParams,
    TDaoMemberAllowanceUpdateResult,
    TDaoMemberCreateParams,
    TDaoMemberCreateResult,
    TDaoMemberDeleteParams,
    TDaoMemberDeleteResult,
    TDaoMemberDetails,
    TDaoMintDisableParams,
    TDaoMintDisableResult,
    TDaoMintTokenParams,
    TDaoMintTokenResult,
    TDaoRegularTokenAddParams,
    TDaoRegularTokenAddResult,
    TDaoReviewParams,
    TDaoReviewResult,
    TDaoStartPaidMembershipParams,
    TDaoStartPaidMembershipResult,
    TDaoStopPaidMembershipParams,
    TDaoStopPaidMembershipResult,
    TDaoSupplyDetails,
    TDaoTagCreateParams,
    TDaoTagCreateResult,
    TDaoTagDeleteParams,
    TDaoTagDeleteResult,
    TDaoTokenDaoLockParams,
    TDaoTokenDaoLockResult,
    TDaoTokenDaoSendParams,
    TDaoTokenDaoTransferParams,
    TDaoTokenDaoTransferResult,
    TDaoUpgradeParams,
    TDaoUpgradeResult,
    TDaoVoteParams,
    TDaoVoteResult,
    TDaoVotingTokenAddParams,
    TDaoVotingTokenAddResult,
    TIsMemberParams,
    TIsMemberResult,
    TSubTaskCreateParams,
    TSubTaskCreateResult,
    TSubTaskDeleteParams,
    TSubTaskDeleteResult,
    TTaskCreateParams,
    TTaskCreateResult,
    TTaskDeleteParams,
    TTaskDeleteResult,
    TTaskDetails,
    TTaskListItem,
    TTaskReceiveBountyDaoParams,
    TTaskReceiveBountyDaoResult,
    TTaskReceiveBountyParams,
    TTaskTransferParams,
    TTaskTransferResult,
    TTaskUpgradeCompleteParams,
    TTaskUpgradeCompleteResult,
    TTaskUpgradeParams,
    TTaskUpgradeResult,
    TTopic,
    TTopicCreateParams,
    TTopicMessageCreateParams,
    TUpgradeVersionControllerParams,
    TUpgradeVersionControllerResult,
    TUserParam,
    TWalletDetails,
}
