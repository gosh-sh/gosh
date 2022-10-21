type TAddress = string

export type TSmvBalanceDetails = {
    balance: number
    smvBalance: number
    smvLocked: number
    smvBusy: boolean
    numClients: number
    goshBalance: number
    goshLockerBalance: number
}

export type TGoshEventDetails = {
    address: string
    id: string
    params: any
    time: { start: Date; finish: Date; realFinish: Date }
    votes: { yes: number; no: number }
    status: { completed: boolean; accepted: boolean }
    total_votes: number
    client_address: string
    your_votes: number
}

export enum EBlobFlag {
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

export { TAddress }
