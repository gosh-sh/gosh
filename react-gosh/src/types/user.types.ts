import { KeyPair } from '@eversdk/core'

type TUserPersist = {
    username?: string
    profile?: string
    phrase?: string
    nonce?: string
    pin?: string
}

type TUser = TUserPersist & {
    keys?: KeyPair
}

type TUserSignupProgress = {
    isFetching: boolean
    isProfileDeployed?: boolean
}

type TProfileDetails = {
    name: string
    custodians: {
        list: { index: number; pubkey: string }[]
        needed: number
    }
}

export { TUserPersist, TUser, TUserSignupProgress, TProfileDetails }
