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

export { TDaoDetails, TDaoListItem }
