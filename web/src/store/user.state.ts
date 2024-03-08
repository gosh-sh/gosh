import { atom } from 'recoil'
import { TUser, TUserPersist } from '../types/user.types'
import { persistAtom } from './base'

const userPersistAtom = atom<TUserPersist>({
  key: 'UserPersistAtom',
  default: {},
  effects_UNSTABLE: [persistAtom],
})

const userAtom = atom<TUser>({
  key: 'UserAtom',
  default: {},
  dangerouslyAllowMutability: true,
})

export { userAtom, userPersistAtom }
