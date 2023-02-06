import { IGoshSmvAdapter } from '../gosh/interfaces'

enum ESmvEventType {
    PULL_REQUEST = 1,
    BRANCH_LOCK = 2,
    BRANCH_UNLOCK = 3,
    DAO_MEMBER_ADD = 5,
    DAO_MEMBER_DELETE = 6,
    DAO_UPGRADE = 7,
    DAO_CONFIG_CHANGE = 8,
    TASK_CONFIRM = 9,
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
}

type TSmvDetails = {
    smvBalance: number
    smvAvailable: number
    smvLocked: number
    isLockerBusy: boolean
}

type TSmvEventMinimal = {
    address: string
    type: {
        kind: number
        name: string
    }
    status: {
        completed: boolean
        accepted: boolean
    }
    time: {
        start: number
        finish: number
        finishReal: number
    }
}

type TSmvEvent = TSmvEventMinimal & {
    data: any
    votes: {
        yes: number
        no: number
        yours: number
        total: number
    }
}

type TSmvEventListItem = Omit<TSmvEvent, 'data' | 'votes'> & {
    adapter: IGoshSmvAdapter
    data?: any
    votes?: {
        yes: number
        no: number
        yours: number
        total: number
    }
    isLoadDetailsFired?: boolean
}

export { ESmvEventType, TSmvDetails, TSmvEventMinimal, TSmvEvent, TSmvEventListItem }
