import { SystemContract as SystemContract1 } from '../v1/blockchain/systemcontract'
import { SystemContract as SystemContract2 } from '../v2/blockchain/systemcontract'
import { Dao as Dao1 } from '../v1/blockchain/dao'
import { Dao as Dao2 } from '../v2/blockchain/dao'

export interface TSystemContract extends SystemContract1, SystemContract2 {}
export interface TDao extends Dao1, Dao2 {}

export type TPaginatedAccountsResult = {
    results: any[]
    lastId?: string
    completed: boolean
}
