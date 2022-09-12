import { atom } from 'recoil'
import { TUser, TUserPersist } from '../types'
import { persistAtom } from './base'

const userPersistAtom = atom<TUserPersist>({
    key: 'UserPersistAtom',
    default: {},
    effects_UNSTABLE: [persistAtom],
})

const userAtom = atom<TUser>({
    key: 'UserAtom',
    default: {},
})

export { userAtom, userPersistAtom }
