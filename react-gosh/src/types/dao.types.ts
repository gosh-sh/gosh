type TDaoDetails = {
    address: string
    name: string
    participants: string[]
    supply: number
}

type TDaoListItem = Omit<TDaoDetails, 'participants' | 'supply'> & {
    participants?: string[]
    supply?: number
    isLoadDetailsFired?: boolean
}

type TDaoCreateProgress = {
    isFetching: boolean
    isDaoDeployed?: boolean
    participants: TDaoMemberCreateProgress['members']
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
        pubkey: string
        isDeployed?: boolean
        isMinted?: boolean
    }[]
}

export {
    TDaoDetails,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMemberDetails,
    TDaoMemberListItem,
    TDaoMemberCreateProgress,
}
