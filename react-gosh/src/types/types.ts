export type TSmvBalanceDetails = {
    balance: number
    smvBalance: number
    smvLocked: number
    smvBusy: boolean
}

export type TGoshEventDetails = {
    address: string
    id: string
    params: any
    time: { start: Date; finish: Date }
    votes: { yes: number; no: number }
    status: { completed: boolean; accepted: boolean }
}

export type TGoshDiff = {
    snap: string
    patch: string | null
    ipfs: string | null
    commit: string
    sha1: string
    sha256: string
}

export enum EGoshBlobFlag {
    BINARY = 1,
    COMPRESSED = 2,
    IPFS = 4,
}

export enum EEventType {
    PR = 1,
    BRANCH_LOCK = 2,
    BRANCH_UNLOCK = 3,
}

export type TValidationResult = {
    valid: boolean
    reason?: string
}
