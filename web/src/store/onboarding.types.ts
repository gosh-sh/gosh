export type TOnboardingOrganization = {
    id: string
    name: string
    avatar: string
    description: string
    isUser: boolean
    isOpen: boolean
    repositories: {
        items: TOnboardingRepository[]
        isFetching: boolean
    }
}

export type TOnboardingRepository = {
    daoName: string
    id: number
    name: string
    description: string
    updatedAt: string
    isSelected: boolean
}

export type TOnboardingInvite = {
    senderUsername: string
    daoName: string
    accepted: boolean
}
