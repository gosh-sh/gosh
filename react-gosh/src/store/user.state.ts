import { atom } from 'recoil'
import { TUserState, TUserStatePersist } from '../types'
import { persistAtom } from './base'

const userPersistAtom = atom<TUserStatePersist>({
    key: 'UserPersistAtom',
    default: {},
    effects_UNSTABLE: [persistAtom],
})

const userAtom = atom<TUserState>({
    key: 'UserAtom',
    default: {},
})

export { userAtom, userPersistAtom }
