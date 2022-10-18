import { KeyPair } from '@eversdk/core'
import { TAddress } from './types'

type TUserPersist = {
    username?: string
    profile?: TAddress
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
