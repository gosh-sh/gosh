import { atom } from 'recoil'
import { TUserState, TUserStatePersist } from '../types'
import { persistAtom } from './base'

const userStatePersistAtom = atom<TUserStatePersist>({
    key: 'UserStatePersistAtom',
    default: {
        phrase: undefined,
        nonce: undefined,
        pin: undefined,
    },
    effects_UNSTABLE: [persistAtom],
})

const userStateAtom = atom<TUserState>({
    key: 'UserStateAtom',
    default: {
        phrase: undefined,
        nonce: undefined,
        pin: undefined,
        keys: undefined,
    },
})

export { userStateAtom, userStatePersistAtom }
