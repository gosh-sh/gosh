import { IGoshSmvAdapter } from '../gosh/interfaces'

enum ESmvEventType {
    PR = 1,
    BRANCH_LOCK = 2,
    BRANCH_UNLOCK = 3,
    DAO_MEMBER_ADD = 5,
    DAO_MEMBER_DELETE = 6,
    DAO_UPGRADE = 7,
}

type TSmvDetails = {
    balance: number
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
}

type TSmvEvent = TSmvEventMinimal & {
    time: {
        start: number
        finish: number
        finishReal: number
    }
    data: any
    votes: {
        yes: number
        no: number
        yours: number
        total: number
    }
}

type TSmvEventListItem = Omit<TSmvEvent, 'time' | 'data' | 'votes'> & {
    adapter: IGoshSmvAdapter
    time?: {
        start: number
        finish: number
        finishReal: number
    }
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
