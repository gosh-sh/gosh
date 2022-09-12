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

export { TUserPersist, TUser, TUserSignupProgress }
