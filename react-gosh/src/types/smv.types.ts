import { IGoshSmvAdapter } from '../gosh/interfaces'

enum ESmvEventType {
    PULL_REQUEST = 1,
    BRANCH_LOCK = 2,
    BRANCH_UNLOCK = 3,
    DAO_MEMBER_ADD = 5,
    DAO_MEMBER_DELETE = 6,
    DAO_UPGRADE = 7,
    DAO_CONFIG_CHANGE = 8,
    BIGTASK_APPROVE = 9,
    TASK_DELETE = 10,
    TASK_CREATE = 11,
    REPO_CREATE = 12,
    DAO_TOKEN_VOTING_ADD = 13,
    DAO_TOKEN_REGULAR_ADD = 14,
    DAO_TOKEN_MINT = 15,
    DAO_TAG_ADD = 16,
    DAO_TAG_REMOVE = 17,
    DAO_TOKEN_MINT_DISABLE = 18,
    DAO_ALLOWANCE_CHANGE = 19,
    MULTI_PROPOSAL = 20,
    REPO_TAG_ADD = 21,
    REPO_TAG_REMOVE = 22,
    REPO_UPDATE_DESCRIPTION = 23,
    DAO_EVENT_ALLOW_DISCUSSION = 24,
    DAO_EVENT_HIDE_PROGRESS = 25,
    REPO_TAG_UPGRADE = 26,
    DAO_ASK_MEMBERSHIP_ALLOWANCE = 27,
    DAO_VOTE = 28,
    MULTI_PROPOSAL_AS_DAO = 29,
    DELAY = 30,
    DAO_TOKEN_DAO_SEND = 31,
    UPGRADE_VERSION_CONTROLLER = 32,
    DAO_REVIEWER = 33,
    DAO_RECEIVE_BOUNTY = 34,
    DAO_TOKEN_DAO_LOCK = 35,
    TASK_REDEPLOY = 36,
    TASK_REDEPLOYED = 37,
    TASK_UPGRADE = 38,
    DAO_TOKEN_TRANSFER_FROM_PREV = 39,
    DAO_START_PAID_MEMBERSHIP = 40,
    DAO_STOP_PAID_MEMBERSHIP = 41,
    BIGTASK_DELETE = 42,
    BIGTASK_CREATE = 43,
    BIGTASK_UPGRADE = 44,
    INDEX_EVENT = 45,
}

type TSmvDetails = {
    smvBalance: number
    smvAvailable: number
    smvLocked: number
    isLockerBusy: boolean
    allowance: number
}

type TSmvEventVotes = {
    yes: number
    no: number
    yours: number
    total: number
}

type TSmvEventStatus = {
    completed: boolean
    accepted: boolean
}

type TSmvEventTime = {
    start: number
    finish: number
    finishReal: number
}

type TSmvEventMinimal = {
    address: string
    type: {
        kind: number
        name: string
    }
}

type TSmvEvent = TSmvEventMinimal & {
    data: any
    time: TSmvEventTime
    votes: TSmvEventVotes
    status: TSmvEventStatus
    reviewers: string[]
}

type TSmvEventListItem = TSmvEventMinimal & {
    adapter: IGoshSmvAdapter
    status?: TSmvEventStatus
    time?: TSmvEventTime
    votes?: TSmvEventVotes
    isLoadDetailsFired?: boolean
}

export {
    ESmvEventType,
    TSmvDetails,
    TSmvEventVotes,
    TSmvEventStatus,
    TSmvEventTime,
    TSmvEventMinimal,
    TSmvEvent,
    TSmvEventListItem,
}
