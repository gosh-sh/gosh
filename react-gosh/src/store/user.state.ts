import { atom } from 'recoil'
import { recoilPersist } from 'recoil-persist'
import { TUserState, TUserStatePersist } from '../types'

const { persistAtom } = recoilPersist({ key: 'recoil' })

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
