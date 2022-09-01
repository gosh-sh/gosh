type TDaoDetails = {
    address: string
    name: string
    members: string[]
    supply: number
    ownerPubkey: string
}

type TDaoListItem = Omit<TDaoDetails, 'members' | 'supply' | 'ownerPubkey'> & {
    members?: string[]
    supply?: number
    ownerPubkey?: string
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
