import { KeyPair } from '@eversdk/core'
import { IGoshDao } from '../gosh/interfaces'

type TDaoDetails = {
    address: string
    name: string
    version: string
    members: { profile: string; wallet: string }[]
    supply: number
    owner: string
}

type TDaoListItem = Omit<TDaoDetails, 'members' | 'supply' | 'owner'> & {
    instance: IGoshDao
    members?: { profile: string; wallet: string }[]
    supply?: number
    owner?: string
    isLoadDetailsFired?: boolean
}

type TDaoCreateProgress = {
    isFetching: boolean
    isDaoDeployed?: boolean
}

type TDaoMemberDetails = {
    name: string
    profile: string
    wallet: string
    smvBalance: number
}

type TDaoMemberListItem = Omit<TDaoMemberDetails, 'smvBalance'> & {
    smvBalance?: number
    isLoadDetailsFired?: boolean
}

type TDaoMemberCreateProgress = {
    isFetching: boolean
    members: {
        member: string
        isDeployed?: boolean
        isMinted?: boolean
    }[]
}

type TWalletDetails = {
    address: string
    version: string
    keys?: KeyPair
    daoAddress: string
    isDaoMember: boolean
    isDaoOwner: boolean
}

export {
    TDaoDetails,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMemberDetails,
    TDaoMemberListItem,
    TDaoMemberCreateProgress,
    TWalletDetails,
}
