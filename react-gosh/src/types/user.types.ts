import { KeyPair } from '@eversdk/core'

type TUserStatePersist = {
    username?: string
    profile?: string
    phrase?: string
    nonce?: string
    pin?: string
}

type TUserState = TUserStatePersist & {
    keys?: KeyPair
}

type TUserSignupProgress = {
    isFetching: boolean
    isProfileDeployed?: boolean
}

export { TUserStatePersist, TUserState, TUserSignupProgress }
