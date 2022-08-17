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
    participants: { pubkey: string; isDeployed?: boolean; isMinted?: boolean }[]
}

type TDaoMemberDetails = {
    wallet: string
    pubkey: string
    smvBalance: number
}

type TDaoMemberListItem = Omit<TDaoMemberDetails, 'smvBalance'> & {
    smvBalance?: number
    isLoadDetailsFired?: boolean
}

export {
    TDaoDetails,
    TDaoListItem,
    TDaoCreateProgress,
    TDaoMemberDetails,
    TDaoMemberListItem,
}
