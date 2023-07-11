import { SystemContract as SystemContract1 } from '../v1/blockchain/systemcontract'
import { SystemContract as SystemContract2 } from '../v2/blockchain/systemcontract'
import { SystemContract as SystemContract3 } from '../v3/blockchain/systemcontract'

export type TSystemContract = SystemContract1 | SystemContract2 | SystemContract3

export type TPaginatedAccountsResult = {
    results: any[]
    lastId?: string
    completed: boolean
}
