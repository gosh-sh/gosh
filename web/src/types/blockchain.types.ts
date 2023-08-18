import { SystemContract as SystemContract1 } from '../v1.0.0/blockchain/systemcontract'
import { SystemContract as SystemContract2 } from '../v2.0.0/blockchain/systemcontract'
import { SystemContract as SystemContract3 } from '../v3.0.0/blockchain/systemcontract'
import { SystemContract as SystemContract4 } from '../v4.0.0/blockchain/systemcontract'
import { SystemContract as SystemContract5 } from '../v5.0.0/blockchain/systemcontract'
import { SystemContract as SystemContract5_1 } from '../v5.1.0/blockchain/systemcontract'

export type TSystemContract =
    | SystemContract1
    | SystemContract2
    | SystemContract3
    | SystemContract4
    | SystemContract5
    | SystemContract5_1

export type TPaginatedAccountsResult = {
    results: any[]
    lastId?: string
    completed: boolean
}
