import { KeyPair } from '@eversdk/core'

type TDaoDetails = {
    address: string
    name: string
    version: string
    members: string[]
    supply: number
    owner: string
}

type TDaoListItem = Omit<TDaoDetails, 'members' | 'supply' | 'owner'> & {
    members?: string[]
    supply?: number
    owner?: string
    isLoadDetailsFired?: boolean
}

type TDaoCreateProgress = {
    isFetching: boolean
    isDaoDeployed?: boolean
    members: TDaoMemberCreateProgress['members']
}

type TDaoMemberDetails = {
    wallet: string
    pubkey: string
    smvBalance: number
}

type TDaoMemberListItem = Omit<TDaoMemberDetails, 'pubkey' | 'smvBalance'> & {
    pubkey?: string
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
